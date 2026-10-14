import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fixtureText from '../../tests/fixtures/progress-v1.json?raw';
import { emptyProgress, type Progress } from '../domain/progress';
import { planSettings } from '../domain/planners';
import { openDb, readRecord, readRaw, transactCommit, writeFresh, type Db } from './db';
import { ProgressStore, type StoreDeps, type StoreState } from './store';

const NOW = new Date(2026, 9, 14, 10, 0);
let counter = 0;
const freshName = () => `test-db-${String(++counter)}`;

const addXp = (n: number) => (p: Progress) => ({ ...p, xp: p.xp + n });

function readyOf(store: ProgressStore): Extract<StoreState, { status: 'ready' }> {
  const s = store.getState();
  if (s.status !== 'ready') throw new Error(`expected ready, got ${s.status}`);
  return s;
}

/** Writes a record straight into IndexedDB, bypassing the store. */
async function seed(name: string, record: unknown): Promise<void> {
  const db = await openDb(name);
  await db.put('kv', record, 'progress');
  db.close();
}

async function stored(name: string): Promise<unknown> {
  const db = await openDb(name);
  const raw = await readRaw(db);
  db.close();
  return raw;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('load', () => {
  it('creates an empty document at revision 1 on the first run', async () => {
    const name = freshName();
    const store = new ProgressStore(name);
    expect(store.getState().status).toBe('loading');
    await store.load(NOW);
    const s = readyOf(store);
    expect(s.rev).toBe(1);
    expect(s.progress).toEqual(emptyProgress('2026-10-14'));
    expect(s.saveError).toBeNull();
    const db = await openDb(name);
    expect((await readRecord(db))?.rev).toBe(1);
    db.close();
  });

  it('is safe to call twice (only one load happens)', async () => {
    const store = new ProgressStore(freshName());
    await Promise.all([store.load(NOW), store.load(NOW)]);
    expect(readyOf(store).rev).toBe(1);
  });

  it('reports `unavailable` with in-memory progress when IndexedDB cannot be opened', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = new ProgressStore(freshName());
    await store.load(NOW);
    const s = store.getState();
    expect(s.status).toBe('unavailable');
    // lessons stay playable: commits work in memory
    await store.commit(addXp(15));
    const after = store.getState();
    expect(after.status === 'unavailable' && after.progress.xp).toBe(15);
  });

  it('shows `broken` (not `unavailable`) when the database opens but the record cannot be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const name = freshName();
    const record = { rev: 3, savedAt: 'x', doc: emptyProgress('2026-10-01') };
    await seed(name, record);
    const close = vi.fn();
    const store = new ProgressStore(name, {
      openDb: () => Promise.resolve({ close } as unknown as Db),
      readRecord: () => Promise.reject(new Error('read exploded')),
      writeFresh,
      transactCommit,
      readRaw,
    });
    await store.load(NOW);
    expect(store.getState()).toEqual({ status: 'broken', reason: 'read exploded' });
    expect(close).toHaveBeenCalledOnce();
    expect(await stored(name)).toEqual(record);
    await expect(store.commit(addXp(1))).rejects.toThrow();
    await store.retrySave();
    // "Start fresh" opens the database again; here that connection can't be used, so it fails.
    await expect(store.startFresh(NOW)).rejects.toThrow();
    expect(close).toHaveBeenCalledTimes(2);
    expect(store.getState().status).toBe('broken');
    expect(await stored(name)).toEqual(record);
  });

  it('plays in memory (`unavailable`) when nothing is saved yet and the first record cannot be created', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const close = vi.fn();
    const store = new ProgressStore(freshName(), {
      openDb: () => Promise.resolve({ close } as unknown as Db),
      readRecord: () => Promise.resolve(null),
      writeFresh: () => Promise.reject(new Error('disk full')),
      transactCommit,
      readRaw,
    });
    await store.load(NOW);
    expect(store.getState()).toEqual({
      status: 'unavailable',
      progress: emptyProgress('2026-10-14'),
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it.each([
    ['garbage text', { rev: 4, savedAt: 'x', doc: 'garbage' }],
    [
      'a newer schema',
      { rev: 4, savedAt: 'x', doc: { ...emptyProgress('2026-10-01'), schemaVersion: 99 } },
    ],
    ['a record that is not even a record', 'what'],
  ])('shows `broken` for %s and leaves the stored record untouched', async (_label, record) => {
    const name = freshName();
    await seed(name, record);
    const store = new ProgressStore(name);
    await store.load(NOW);
    expect(store.getState().status).toBe('broken');
    await expect(store.commit(addXp(1))).rejects.toThrow();
    expect(await stored(name)).toEqual(record);
  });

  it('repairs a damaged document in memory but does not rewrite it until the next commit', async () => {
    const name = freshName();
    const damaged = {
      ...emptyProgress('2026-10-01'),
      xp: 'lots',
      totals: { questionsAnswered: 3.7 },
    };
    await seed(name, { rev: 5, savedAt: 'x', doc: damaged });
    const store = new ProgressStore(name);
    await store.load(NOW);
    const s = readyOf(store);
    expect(s.repaired.length).toBeGreaterThan(0);
    expect(s.progress.xp).toBe(0);
    expect(await stored(name)).toEqual({ rev: 5, savedAt: 'x', doc: damaged });
    await store.commit(addXp(10));
    const raw = (await stored(name)) as { rev: number; doc: Progress };
    expect(raw.rev).toBe(6);
    expect(raw.doc.xp).toBe(10);
  });
});

describe('saved data from earlier versions', () => {
  it('loads the schema-1 fixture without loss and without repairs', async () => {
    const name = freshName();
    const fixture = JSON.parse(fixtureText) as Progress;
    await seed(name, { rev: 9, savedAt: 'x', doc: fixture });
    const store = new ProgressStore(name);
    await store.load(NOW);
    const s = readyOf(store);
    expect(s.repaired).toEqual([]);
    expect(s.progress).toEqual(fixture);
    expect(s.rev).toBe(9);
  });
});

describe('commit', () => {
  it('applies the planner, bumps the revision, persists and survives a reload', async () => {
    const name = freshName();
    const a = new ProgressStore(name);
    await a.load(NOW);
    await a.commit(addXp(15));
    expect(readyOf(a).progress.xp).toBe(15);
    expect(readyOf(a).rev).toBe(2);
    const b = new ProgressStore(name);
    await b.load(NOW);
    expect(readyOf(b).progress.xp).toBe(15);
    expect(readyOf(b).rev).toBe(2);
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const store = new ProgressStore(freshName());
    await store.load(NOW);
    const fn = vi.fn();
    const off = store.subscribe(fn);
    await store.commit(addXp(1));
    expect(fn).toHaveBeenCalled();
    fn.mockClear();
    off();
    await store.commit(addXp(1));
    expect(fn).not.toHaveBeenCalled();
  });

  it('runs 20 concurrent commits one at a time (xp 20)', async () => {
    const store = new ProgressStore(freshName());
    await store.load(NOW);
    await Promise.all(Array.from({ length: 20 }, () => store.commit(addXp(1))));
    expect(readyOf(store).progress.xp).toBe(20);
    expect(readyOf(store).rev).toBe(21);
  });

  it("two tabs: a commit from stale memory is re-applied on the other tab's document", async () => {
    const name = freshName();
    const a = new ProgressStore(name);
    const b = new ProgressStore(name);
    await a.load(NOW);
    await b.load(NOW);
    await a.commit(addXp(10));
    await b.commit((p) => ({
      ...p,
      totals: { ...p.totals, lessonsDone: p.totals.lessonsDone + 1 },
    }));
    const s = readyOf(b);
    expect(s.progress.xp).toBe(10);
    expect(s.progress.totals.lessonsDone).toBe(1);
    expect(s.rev).toBe(3);
    const c = new ProgressStore(name);
    await c.load(NOW);
    expect(readyOf(c).progress.xp).toBe(10);
    expect(readyOf(c).progress.totals.lessonsDone).toBe(1);
  });

  it('refuses a planner that makes an invalid document: nothing is written and the error is raised', async () => {
    const name = freshName();
    const store = new ProgressStore(name);
    await store.load(NOW);
    await expect(store.commit((p) => ({ ...p, xp: -5 }))).rejects.toThrow(/invalid/);
    await expect(
      store.commit(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow(/boom/);
    expect(readyOf(store).progress.xp).toBe(0);
    expect(readyOf(store).rev).toBe(1);
    expect(((await stored(name)) as { rev: number }).rev).toBe(1);
    // and the queue still works afterwards
    await store.commit(addXp(2));
    expect(readyOf(store).progress.xp).toBe(2);
  });

  it('does not mutate the document it is given', async () => {
    const store = new ProgressStore(freshName());
    await store.load(NOW);
    const before = readyOf(store).progress;
    const snapshot = JSON.stringify(before);
    await store.commit((p) => planSettings(p, { dailyGoal: 3 }));
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('on a write failure keeps the change in memory, sets saveError, and retrySave writes it', async () => {
    const name = freshName();
    const store = new ProgressStore(name);
    await store.load(NOW);
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new Error('disk full');
    });
    await store.commit(addXp(15));
    let s = readyOf(store);
    expect(s.progress.xp).toBe(15);
    expect(s.saveError).toBe('disk full');
    expect(((await stored(name)) as { doc: Progress }).doc.xp).toBe(0);
    // a second change while failing is kept too
    await store.commit(addXp(5));
    expect(readyOf(store).progress.xp).toBe(20);
    put.mockRestore();
    await store.retrySave();
    s = readyOf(store);
    expect(s.saveError).toBeNull();
    expect(s.progress.xp).toBe(20);
    const raw = (await stored(name)) as { rev: number; doc: Progress };
    expect(raw.doc.xp).toBe(20);
    expect(raw.rev).toBe(2);
  });
  it('a buggy planner whose transaction never started is dropped, so later saves still work', async () => {
    const name = freshName();
    const store = new ProgressStore(name);
    await store.load(NOW);
    const tx = vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(() => {
      throw new Error('database closed');
    });
    await expect(store.commit((p) => ({ ...p, xp: -1 }))).rejects.toThrow('invalid');
    tx.mockRestore();
    await store.commit(addXp(3));
    const s = readyOf(store);
    expect(s.saveError).toBeNull();
    expect(s.progress.xp).toBe(3);
    expect(((await stored(name)) as { doc: Progress }).doc.xp).toBe(3);
  });

  it("a failed write after another tab saved keeps that tab's progress in memory too", async () => {
    const name = freshName();
    const a = new ProgressStore(name);
    const b = new ProgressStore(name);
    await a.load(NOW);
    await b.load(NOW);
    await a.commit(addXp(10));
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new Error('disk full');
    });
    await b.commit(addXp(1));
    const s = readyOf(b);
    expect(s.saveError).toBe('disk full');
    expect(s.progress.xp).toBe(11);
  });
});

describe('a lost database connection (iPhone Safari after the app was in the background)', () => {
  /** Real functions, but every handle listed in `dead` fails writes like a dropped connection. */
  function depsWithDeadHandles(dead: Set<Db>, killNew = { value: false }) {
    const opened: Db[] = [];
    const deps: StoreDeps = {
      openDb: async (name, onTerminated) => {
        const handle = await openDb(name, onTerminated);
        opened.push(handle);
        if (killNew.value) dead.add(handle);
        return handle;
      },
      readRecord,
      writeFresh,
      readRaw,
      transactCommit: (handle, apply, savedAt) =>
        dead.has(handle)
          ? Promise.reject(
              new DOMException('Connection to Indexed Database server lost.', 'InvalidStateError'),
            )
          : transactCommit(handle, apply, savedAt),
    };
    return { deps, opened };
  }

  it('Try again opens a new connection and saves the lesson', async () => {
    const name = freshName();
    const dead = new Set<Db>();
    const { deps, opened } = depsWithDeadHandles(dead);
    const store = new ProgressStore(name, deps);
    await store.load(NOW);
    dead.add(opened[0] as Db);
    await store.commit(addXp(15));
    expect(readyOf(store).saveError).toContain('Connection');
    await store.retrySave();
    const s = readyOf(store);
    expect(s.saveError).toBeNull();
    expect(s.progress.xp).toBe(15);
    expect(((await stored(name)) as { doc: Progress }).doc.xp).toBe(15);
    expect(opened).toHaveLength(2);
  });

  it('reopens once per attempt, not once per failure, and later commits reuse the new connection', async () => {
    const name = freshName();
    const dead = new Set<Db>();
    const killNew = { value: false };
    const { deps, opened } = depsWithDeadHandles(dead, killNew);
    const store = new ProgressStore(name, deps);
    await store.load(NOW);
    dead.add(opened[0] as Db);
    await store.commit(addXp(5)); // fails, forgets connection 1
    killNew.value = true;
    await store.retrySave(); // opens connection 2, which is dead too
    expect(opened).toHaveLength(2);
    expect(readyOf(store).saveError).toContain('Connection');
    killNew.value = false;
    await store.retrySave(); // reopens: connection 3, which works
    expect(opened).toHaveLength(3);
    expect(readyOf(store).saveError).toBeNull();
    await store.commit(addXp(1));
    expect(opened).toHaveLength(3); // the new connection is kept
    expect(readyOf(store).progress.xp).toBe(6);
    expect(((await stored(name)) as { doc: Progress }).doc.xp).toBe(6);
  });

  it('keeps the change and the warning when reopening fails too, then recovers', async () => {
    const name = freshName();
    const dead = new Set<Db>();
    const { deps, opened } = depsWithDeadHandles(dead);
    let blocked = false;
    const store = new ProgressStore(name, {
      ...deps,
      openDb: (n, t) => (blocked ? Promise.reject(new Error('cannot open')) : deps.openDb(n, t)),
    });
    await store.load(NOW);
    dead.add(opened[0] as Db);
    await store.commit(addXp(15));
    blocked = true;
    await store.retrySave();
    let s = readyOf(store);
    expect(s.saveError).toBe('cannot open');
    expect(s.progress.xp).toBe(15);
    blocked = false;
    await store.retrySave();
    s = readyOf(store);
    expect(s.saveError).toBeNull();
    expect(((await stored(name)) as { doc: Progress }).doc.xp).toBe(15);
  });

  it('does not load again or touch the screen state beyond the save result', async () => {
    const dead = new Set<Db>();
    const { deps, opened } = depsWithDeadHandles(dead);
    const store = new ProgressStore(freshName(), deps);
    await store.load(NOW);
    dead.add(opened[0] as Db);
    await store.commit(addXp(2));
    await store.retrySave();
    await store.load(NOW);
    expect(readyOf(store).progress.xp).toBe(2);
    expect(readyOf(store).repaired).toEqual([]);
  });
});

describe('startFresh', () => {
  it('replaces unreadable data only from the broken state', async () => {
    const name = freshName();
    await seed(name, { rev: 3, savedAt: 'x', doc: 'garbage' });
    const store = new ProgressStore(name);
    await store.load(NOW);
    await store.startFresh(NOW);
    expect(readyOf(store).progress).toEqual(emptyProgress('2026-10-14'));
    expect(((await stored(name)) as { rev: number }).rev).toBe(4);
    await expect(store.startFresh(NOW)).rejects.toThrow();
  });

  it('never replaces progress that became readable since (another tab saved it)', async () => {
    const name = freshName();
    await seed(name, { rev: 3, savedAt: 'x', doc: 'garbage' });
    const store = new ProgressStore(name);
    await store.load(NOW);
    expect(store.getState().status).toBe('broken');
    const good = { rev: 4, savedAt: 'y', doc: { ...emptyProgress('2026-10-01'), xp: 120 } };
    await seed(name, good);
    await expect(store.startFresh(NOW)).rejects.toThrow(/can be read again/);
    expect(await stored(name)).toEqual(good);
    expect(store.getState().status).toBe('broken');
  });
});

describe('after a failed read', () => {
  const failingRead = (): ConstructorParameters<typeof ProgressStore>[1] => ({
    openDb,
    readRecord: () => Promise.reject(new Error('read exploded')),
    writeFresh,
    transactCommit,
    readRaw,
  });

  it('start fresh opens the database itself and replaces data that is really unreadable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const name = freshName();
    await seed(name, { rev: 3, savedAt: 'x', doc: 'garbage' });
    const store = new ProgressStore(name, failingRead());
    await store.load(NOW);
    expect(store.getState().status).toBe('broken');
    await store.startFresh(NOW);
    expect(readyOf(store).progress).toEqual(emptyProgress('2026-10-14'));
    expect(((await stored(name)) as { rev: number }).rev).toBe(4);
    // and later changes save normally through the new connection
    await store.commit(addXp(5));
    expect(((await stored(name)) as { doc: Progress }).doc.xp).toBe(5);
  });

  it('start fresh refuses when the data turns out to be readable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const name = freshName();
    const good = { rev: 3, savedAt: 'x', doc: { ...emptyProgress('2026-10-01'), xp: 40 } };
    await seed(name, good);
    const store = new ProgressStore(name, failingRead());
    await store.load(NOW);
    await expect(store.startFresh(NOW)).rejects.toThrow(/can be read again/);
    expect(await stored(name)).toEqual(good);
    expect(store.getState().status).toBe('broken');
  });
});

describe('readRawRecord', () => {
  it('returns the stored value exactly and writes nothing', async () => {
    const name = freshName();
    const record = { rev: 7, savedAt: 'x', doc: 'garbage' };
    await seed(name, record);
    const store = new ProgressStore(name);
    await store.load(NOW);
    expect(await store.readRawRecord()).toEqual(record);
    expect(await stored(name)).toEqual(record);
  });

  it('rejects (for the screen to show) when the database cannot be opened', async () => {
    const store = new ProgressStore(freshName(), {
      openDb: () => Promise.reject(new Error('blocked')),
      readRecord,
      writeFresh,
      transactCommit,
      readRaw,
    });
    await expect(store.readRawRecord()).rejects.toThrow('blocked');
  });
});

describe('lastGoodProgress', () => {
  it('is null before loading and the current progress after', async () => {
    const store = new ProgressStore(freshName());
    expect(store.lastGoodProgress()).toBeNull();
    await store.load(NOW);
    await store.commit(addXp(3));
    expect(store.lastGoodProgress()?.xp).toBe(3);
  });
});
