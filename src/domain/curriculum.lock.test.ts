import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from './cards';
import { allLessonIds } from './curriculum';
import lock from './ids.lock.json';

// SPEC 6.4: ids are permanent. Adding an id means adding it to ids.lock.json in the same commit;
// removing or renaming a shipped id is never allowed.
const current = new Set<string>([...allLessonIds(), ...ALL_CARDS]);
const locked = new Set<string>(lock);

describe('ids.lock.json', () => {
  it('is a sorted array of unique strings', () => {
    expect(lock).toEqual([...new Set(lock)].sort());
  });
  it('holds 82 lesson ids and 46 card ids', () => {
    expect(lock.filter((id) => id.startsWith('treble-') || id.startsWith('bass-'))).toHaveLength(
      46,
    );
    expect(lock).toHaveLength(43 + 36 + 3 + 46);
  });
  it('every locked id still exists in the curriculum (nothing removed or renamed)', () => {
    const missing = [...locked].filter((id) => !current.has(id));
    expect(missing).toEqual([]);
  });
  it('every curriculum id is in the lock (new ids are added deliberately)', () => {
    const unlocked = [...current].filter((id) => !locked.has(id));
    expect(unlocked).toEqual([]);
  });
});
