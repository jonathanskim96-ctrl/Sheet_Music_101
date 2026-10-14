import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import v2Text from '../../tests/fixtures/progress-v2.json?raw';
import { openDb, readRaw } from './db';
import { ProgressStore } from './store';

// Simulates an app version from before M8: its upgrade table knows only version 1 and has no
// steps, so version-2 data is "newer" to it (SCHEMA-V2 §2). Everything else is the real store.
vi.mock('../domain/upgrades', async (importOriginal) => {
  const real = await importOriginal<typeof import('../domain/upgrades')>();
  return { ...real, upgradeToCurrent: (raw: unknown) => real.upgradeWith(raw, 1, {}) };
});

const NOW = new Date(2026, 9, 14, 10, 0);
let counter = 0;
const freshName = () => `older-app-db-${String(++counter)}`;

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

describe('an older app version meeting version-2 data (SCHEMA-V2 test 5, at the store)', () => {
  it('refuses it as "newer", keeps sign cards untouched, and writes nothing', async () => {
    const name = freshName();
    const record = { rev: 7, savedAt: 'x', doc: JSON.parse(v2Text) as unknown };
    await seed(name, record);
    const before = JSON.stringify(await stored(name));
    const store = new ProgressStore(name);
    await store.load(NOW);
    const s = store.getState();
    expect(s.status).toBe('broken');
    expect(s.status === 'broken' && s.reason).toContain('newer version');
    await expect(store.commit((p) => ({ ...p, xp: p.xp + 1 }))).rejects.toThrow();
    expect(JSON.stringify(await stored(name))).toBe(before);
  });
});
