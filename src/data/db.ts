// The only file that imports `idb`. Raw reads and writes of the one progress record.
import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'sheet-music-101';
const STORE = 'kv';
const KEY = 'progress';

/** What is stored under the `progress` key. `doc` is untrusted until the store validates it. */
export interface StoredRecord {
  rev: number;
  savedAt: string;
  doc: unknown;
}

export type Db = IDBPDatabase;

/** Opens (and on first run creates) the database. Rejects if IndexedDB is unusable. */
export function openDb(name: string = DB_NAME): Promise<Db> {
  return openDB(name, 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });
}

/**
 * Turns whatever is stored into a record. A stored value that is not shaped like a record
 * becomes `{ rev: 0, doc: <that value> }`, so the validator rejects it and the store shows the
 * "broken" screen instead of overwriting it.
 */
function toRecord(raw: unknown): StoredRecord {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const rev: unknown = Reflect.get(raw, 'rev');
    const savedAt: unknown = Reflect.get(raw, 'savedAt');
    if (typeof rev === 'number' && Number.isSafeInteger(rev) && rev >= 0) {
      return {
        rev,
        savedAt: typeof savedAt === 'string' ? savedAt : '',
        doc: Reflect.get(raw, 'doc'),
      };
    }
  }
  return { rev: 0, savedAt: '', doc: raw };
}

/** The stored record, or null if nothing has been saved yet. */
export async function readRecord(db: Db): Promise<StoredRecord | null> {
  const raw: unknown = await db.get(STORE, KEY);
  return raw === undefined ? null : toRecord(raw);
}

/** The stored value exactly as it is, for the "download the saved data" rescue (M5). */
export async function readRaw(db: Db): Promise<unknown> {
  return (await db.get(STORE, KEY)) as unknown;
}

/**
 * First save only: writes `doc` as revision 1 unless a record already exists (another tab
 * got there first), in which case nothing is written and that record is returned.
 */
export async function writeFresh(
  db: Db,
  doc: unknown,
  savedAt: string,
): Promise<{ created: boolean; record: StoredRecord }> {
  const tx = db.transaction(STORE, 'readwrite');
  try {
    const existing: unknown = await tx.store.get(KEY);
    if (existing !== undefined) {
      await tx.done;
      return { created: false, record: toRecord(existing) };
    }
    const record: StoredRecord = { rev: 1, savedAt, doc };
    await tx.store.put(record, KEY);
    await tx.done;
    return { created: true, record };
  } catch (e) {
    abortQuietly(tx);
    throw e;
  }
}

/**
 * One read-modify-write in a single transaction. `apply` gets the stored record (null if none)
 * and returns the new document; it must be synchronous (a transaction closes if it awaits
 * anything but IndexedDB). If `apply` throws, nothing is written and the error is rethrown.
 * The new revision is the stored one plus 1, so two tabs never reuse a number.
 */
export async function transactCommit(
  db: Db,
  apply: (current: StoredRecord | null) => unknown,
  savedAt: string,
): Promise<StoredRecord> {
  const tx = db.transaction(STORE, 'readwrite');
  try {
    const raw: unknown = await tx.store.get(KEY);
    const current = raw === undefined ? null : toRecord(raw);
    const doc = apply(current);
    const record: StoredRecord = { rev: (current?.rev ?? 0) + 1, savedAt, doc };
    await tx.store.put(record, KEY);
    await tx.done;
    return record;
  } catch (e) {
    abortQuietly(tx);
    throw e;
  }
}

function abortQuietly(tx: { abort: () => void; done: Promise<void> }): void {
  // The original error is what matters; an abort of an already finished transaction is expected.
  tx.done.catch(() => undefined);
  try {
    tx.abort();
  } catch (e) {
    console.warn('Could not abort the transaction', e);
  }
}
