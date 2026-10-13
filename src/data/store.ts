// The one write path for progress. Everything the learner has done goes through `commit`.
import { dayKeyOf } from '../domain/days';
import { emptyProgress, type Progress } from '../domain/progress';
import { upgradeToCurrent } from '../domain/upgrades';
import { checkProgress } from '../domain/validate';
import * as db from './db';

export type StoreState =
  | { status: 'loading' }
  | {
      status: 'ready';
      progress: Progress;
      rev: number;
      saveError: string | null;
      repaired: string[];
    }
  | { status: 'broken'; reason: string } // stored data unreadable: never overwritten automatically
  | { status: 'unavailable'; progress: Progress }; // IndexedDB unusable: in memory only

export type Planner = (p: Progress) => Progress;

/** The database functions the store uses; tests and the app use the real ones from db.ts. */
export interface StoreDeps {
  openDb: typeof db.openDb;
  readRecord: typeof db.readRecord;
  writeFresh: typeof db.writeFresh;
  transactCommit: typeof db.transactCommit;
  readRaw: typeof db.readRaw;
}

const REAL_DEPS: StoreDeps = {
  openDb: db.openDb,
  readRecord: db.readRecord,
  writeFresh: db.writeFresh,
  transactCommit: db.transactCommit,
  readRaw: db.readRaw,
};

/** A planner produced something invalid (a bug in the app, never the learner's fault). */
export class PlannerError extends Error {
  override name = 'PlannerError';
}

const MSG_NEWER = 'This progress was saved by a newer version of the app.';
const MSG_UNREADABLE = "The saved data can't be read.";
const MSG_READABLE_AGAIN = 'The saved progress can be read again. Reload the app to see it.';

type Interpreted =
  { ok: true; progress: Progress; issues: string[] } | { ok: false; reason: string };

/** Upgrade, then repair-validate, a stored document. Never throws. */
function interpret(doc: unknown): Interpreted {
  const upgraded = upgradeToCurrent(doc);
  if (!upgraded.ok)
    return { ok: false, reason: upgraded.reason === 'newer' ? MSG_NEWER : MSG_UNREADABLE };
  const checked = checkProgress(upgraded.value, 'repair');
  return checked.progress
    ? { ok: true, progress: checked.progress, issues: checked.issues }
    : { ok: false, reason: MSG_UNREADABLE };
}

/** Runs a planner and insists the result is a valid document (SPEC 5.2). */
function applyChecked(planner: Planner, base: Progress): Progress {
  let next: Progress;
  try {
    next = planner(base);
  } catch (e) {
    throw new PlannerError(`A change to the progress failed: ${messageOf(e)}`);
  }
  const checked = checkProgress(next, 'strict');
  if (!checked.progress) {
    throw new PlannerError(
      `A change would have made the progress invalid: ${checked.issues.join('; ')}`,
    );
  }
  return checked.progress;
}

function applyAll(base: Progress, planners: readonly Planner[]): Progress {
  return planners.reduce((p, planner) => applyChecked(planner, p), base);
}

function messageOf(e: unknown): string {
  return e instanceof Error && e.message !== '' ? e.message : 'Unknown error';
}

export class ProgressStore {
  private state: StoreState = { status: 'loading' };
  private readonly listeners = new Set<() => void>();
  private readonly deps: StoreDeps;
  private readonly dbName: string;
  private handle: db.Db | null = null;
  /** The last document known to be on disk, and its revision. */
  private saved: Progress | null = null;
  private rev = 0;
  /** Changes made in memory that could not be saved yet. They are re-applied on the next save. */
  private pending: Planner[] = [];
  private loadPromise: Promise<void> | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(dbName: string = db.DB_NAME, deps: StoreDeps = REAL_DEPS) {
    this.dbName = dbName;
    this.deps = deps;
  }

  getState = (): StoreState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private set(state: StoreState): void {
    this.state = state;
    for (const fn of [...this.listeners]) fn();
  }

  /** Reads the saved progress (creating an empty document on the very first run). Runs once. */
  load(now: Date): Promise<void> {
    this.loadPromise ??= this.doLoad(now);
    return this.loadPromise;
  }

  private async doLoad(now: Date): Promise<void> {
    const today = dayKeyOf(now);
    let handle: db.Db;
    try {
      handle = await this.deps.openDb(this.dbName);
    } catch (e) {
      // Only "the database can't be opened at all" means in-memory progress.
      console.warn('Saved progress is not available in this browser', e);
      this.set({ status: 'unavailable', progress: emptyProgress(today) });
      return;
    }
    let record: db.StoredRecord | null;
    try {
      record = await this.deps.readRecord(handle);
    } catch (e) {
      // The database opened but its contents can't be read: never pretend there is no progress.
      console.warn('Saved progress could not be read', e);
      handle.close();
      this.set({ status: 'broken', reason: messageOf(e) });
      return;
    }
    if (record === null) {
      const fresh = emptyProgress(today);
      try {
        record = (await this.deps.writeFresh(handle, fresh, now.toISOString())).record;
      } catch (e) {
        // Nothing was saved before, so nothing is lost: play in memory, with the warning
        // (owner decision 2026-10-13).
        console.warn('Saved progress is not available in this browser', e);
        handle.close();
        this.set({ status: 'unavailable', progress: fresh });
        return;
      }
    }
    this.handle = handle;
    const result = interpret(record.doc);
    if (!result.ok) {
      this.set({ status: 'broken', reason: result.reason });
      return;
    }
    this.saved = result.progress;
    this.rev = record.rev;
    this.set({
      status: 'ready',
      progress: result.progress,
      rev: record.rev,
      saveError: null,
      repaired: result.issues,
    });
  }

  /**
   * Applies `planner` to the saved progress and saves the result. Calls run one at a time.
   * Rejects (and writes nothing) if the planner produces an invalid document. If only the
   * write fails, the change stays in memory, `saveError` is set and `retrySave()` tries again.
   */
  commit(planner: Planner): Promise<void> {
    return this.enqueue(() => this.doCommit(planner));
  }

  /** Tries again to save changes that could not be written. */
  retrySave(): Promise<void> {
    return this.enqueue(() => this.write([]));
  }

  private enqueue(job: () => Promise<void>): Promise<void> {
    const run = this.chain.then(job);
    // The chain must survive a failed job; the caller still sees the rejection through `run`.
    this.chain = run.catch(() => undefined);
    return run;
  }

  private doCommit(planner: Planner): Promise<void> {
    const s = this.state;
    if (s.status === 'unavailable') {
      this.set({ status: 'unavailable', progress: applyChecked(planner, s.progress) });
      return Promise.resolve();
    }
    if (s.status !== 'ready') {
      return Promise.reject(
        new Error(
          s.status === 'loading' ? 'Progress is still loading.' : 'Saved data is unreadable.',
        ),
      );
    }
    return this.write([planner]);
  }

  private async write(added: readonly Planner[]): Promise<void> {
    const s = this.state;
    const handle = this.handle;
    const base = this.saved;
    if (s.status !== 'ready' || handle === null || base === null) return;
    const attempt = [...this.pending, ...added];
    if (attempt.length === 0 && s.saveError === null) return;
    const out: { start: Progress; written: Progress | null } = { start: base, written: null };
    try {
      const record = await this.deps.transactCommit(
        handle,
        (current) => {
          let start = base;
          if (current !== null && current.rev !== this.rev) {
            // Another tab saved since we loaded: build on what it saved.
            const theirs = interpret(current.doc);
            if (!theirs.ok) throw new Error(theirs.reason);
            start = theirs.progress;
          }
          out.start = start;
          const next = applyAll(start, attempt);
          out.written = next;
          return next;
        },
        new Date().toISOString(),
      );
      const written = out.written;
      if (written === null) throw new Error('Nothing was written');
      this.saved = written;
      this.rev = record.rev;
      this.pending = [];
      this.set({
        status: 'ready',
        progress: written,
        rev: record.rev,
        saveError: null,
        repaired: s.repaired,
      });
    } catch (e) {
      if (e instanceof PlannerError) throw e;
      // The write itself failed: keep the change in memory so the lesson isn't lost. Build on
      // what the transaction read (another tab's newer save, if any), not on our older copy.
      this.pending = attempt;
      this.set({
        status: 'ready',
        progress: applyAll(out.start, attempt),
        rev: this.rev,
        saveError: messageOf(e),
        repaired: s.repaired,
      });
    }
  }

  /**
   * The last progress known to be good (on screen or saved), for the error screen's backup
   * button. Null if nothing was ever loaded.
   */
  lastGoodProgress(): Progress | null {
    const s = this.state;
    if (s.status === 'ready' || s.status === 'unavailable') return s.progress;
    return this.saved;
  }

  /**
   * The stored value exactly as it is, for the broken screen's "Download the saved data".
   * Opens its own connection (after a failed read the store keeps none) and never writes.
   */
  async readRawRecord(): Promise<unknown> {
    const handle = await this.deps.openDb(this.dbName);
    try {
      return await this.deps.readRaw(handle);
    } finally {
      handle.close();
    }
  }

  /** From the "broken" screen only, after the learner confirms: replaces the unreadable record. */
  startFresh(now: Date): Promise<void> {
    return this.enqueue(async () => {
      if (this.state.status !== 'broken') {
        throw new Error('Start fresh is only possible when the saved data is unreadable.');
      }
      // After a failed read no connection is kept: open one now. The transaction below still
      // refuses to replace a record that has become readable.
      const opened = this.handle === null;
      const handle = this.handle ?? (await this.deps.openDb(this.dbName));
      const fresh = emptyProgress(dayKeyOf(now));
      let record: db.StoredRecord;
      try {
        record = await this.deps.transactCommit(
          handle,
          (current) => {
            // Another tab (or a newer app version) may have saved readable progress since this
            // tab gave up on it: that progress must never be replaced.
            if (current !== null && interpret(current.doc).ok) throw new Error(MSG_READABLE_AGAIN);
            return fresh;
          },
          now.toISOString(),
        );
      } catch (e) {
        if (opened) handle.close();
        throw e;
      }
      this.handle = handle;
      this.saved = fresh;
      this.rev = record.rev;
      this.pending = [];
      this.set({
        status: 'ready',
        progress: fresh,
        rev: record.rev,
        saveError: null,
        repaired: [],
      });
    });
  }
}
