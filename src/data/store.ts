// The one write path for progress. Everything the learner has done goes through `commit`.
import { dayKeyOf } from '../domain/days';
import { emptyProgress, type Progress } from '../domain/progress';
import * as db from './db';
import { REAL_DEPS, type StoreDeps, type StoreState } from './storeTypes';
import {
  MSG_NEWER,
  MSG_NEWER_NO_RESET,
  MSG_READABLE_AGAIN,
  PlannerError,
  applyAll,
  applyChecked,
  interpret,
  messageOf,
  type Planner,
} from './storeChecks';

export { PlannerError, type Planner, type StoreDeps, type StoreState };

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

  /** Opens a connection that forgets itself if the browser drops it. */
  private async connect(): Promise<db.Db> {
    const handle = await this.deps.openDb(this.dbName, () => {
      if (this.handle === handle) this.handle = null;
    });
    return handle;
  }

  /** Closes and forgets the connection, so the next save opens a new one. */
  private dropHandle(): void {
    const old = this.handle;
    this.handle = null;
    try {
      old?.close();
    } catch (e) {
      console.warn('Could not close the database connection', e);
    }
  }

  private async doLoad(now: Date): Promise<void> {
    const today = dayKeyOf(now);
    let handle: db.Db;
    try {
      handle = await this.connect();
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
    const base = this.saved;
    if (s.status !== 'ready' || base === null) return;
    const attempt = [...this.pending, ...added];
    if (attempt.length === 0 && s.saveError === null) return;
    const out: { start: Progress; written: Progress | null } = { start: base, written: null };
    try {
      // After a failed save the connection was dropped: open a new one for this attempt.
      this.handle ??= await this.connect();
      const record = await this.deps.transactCommit(
        this.handle,
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
      // The connection may be dead (iPhone Safari drops it in the background): forget it so
      // "Try again" opens a new one instead of failing the same way.
      this.dropHandle();
      // The write itself failed: keep the change in memory so the lesson isn't lost. Build on
      // what the transaction read (another tab's newer save, if any), not on our older copy.
      // If the transaction failed before the planners ran, a buggy one throws here; it must not
      // stay in `pending`, or every later save would fail with it.
      const progress = applyAll(out.start, attempt);
      this.pending = attempt;
      this.set({
        status: 'ready',
        progress,
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
      const state = this.state;
      if (state.status !== 'broken') {
        throw new Error('Start fresh is only possible when the saved data is unreadable.');
      }
      // Progress from a newer app version is never replaced: the fix is to reload the app.
      if (state.reason === MSG_NEWER) throw new Error(MSG_NEWER_NO_RESET);
      // After a failed read no connection is kept: open one now. The transaction below still
      // refuses to replace a record that has become readable.
      const opened = this.handle === null;
      const handle = this.handle ?? (await this.connect());
      const fresh = emptyProgress(dayKeyOf(now));
      let record: db.StoredRecord;
      try {
        record = await this.deps.transactCommit(
          handle,
          (current) => {
            // Another tab (or a newer app version) may have saved readable progress since this
            // tab gave up on it: that progress must never be replaced.
            if (current !== null) {
              const seen = interpret(current.doc);
              if (seen.ok) throw new Error(MSG_READABLE_AGAIN);
              if (seen.reason === MSG_NEWER) throw new Error(MSG_NEWER_NO_RESET);
            }
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
