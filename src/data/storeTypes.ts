// The store's public state and the database functions it is built on.
import type { Progress } from '../domain/progress';
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

/** The database functions the store uses; tests and the app use the real ones from db.ts. */
export interface StoreDeps {
  openDb: typeof db.openDb;
  readRecord: typeof db.readRecord;
  writeFresh: typeof db.writeFresh;
  transactCommit: typeof db.transactCommit;
  readRaw: typeof db.readRaw;
}

export const REAL_DEPS: StoreDeps = {
  openDb: db.openDb,
  readRecord: db.readRecord,
  writeFresh: db.writeFresh,
  transactCommit: db.transactCommit,
  readRaw: db.readRaw,
};
