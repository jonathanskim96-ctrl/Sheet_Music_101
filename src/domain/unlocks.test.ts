import { describe, expect, it } from 'vitest';
import { UNITS, allLessonIds, levelLessons, pathLessons } from './curriculum';
import { emptyProgress, type LessonRecord, type Progress } from './progress';
import type { CardState } from './srs';
import {
  MAX_UNIT_M4,
  currentLesson,
  currentPlayableLesson,
  isAvailable,
  isCompleted,
  isLevelAvailable,
  isPlayable,
  isReviewPlayable,
  keyboardUnlocked,
  levelsPlayable,
  nextLevelLesson,
  reviewAvailable,
  unitLevel,
  unitLevelCount,
} from './unlocks';

const rec = (): LessonRecord => ({
  timesCompleted: 1,
  bestAccuracy: 100,
  firstCompletedDay: '2026-10-01',
  lastCompletedDay: '2026-10-01',
});
const done = (...ids: string[]): Progress => {
  const p = emptyProgress('2026-10-01');
  for (const id of ids) p.lessons[id] = rec();
  return p;
};
const upTo = (lastId: string): string[] => {
  const ids = pathLessons().map((l) => l.id);
  return ids.slice(0, ids.indexOf(lastId) + 1);
};
const level1Of = (unit: number): string[] =>
  pathLessons()
    .filter((l) => l.unit === unit)
    .map((l) => l.id);
const ids = (unit: number, level: 2 | 3): string[] => levelLessons(unit, level).map((l) => l.id);

describe('level 1 chain', () => {
  it('empty progress: only u1-l1 is available', () => {
    const p = emptyProgress('2026-10-01');
    const available = pathLessons()
      .filter((l) => isAvailable(p, l.id))
      .map((l) => l.id);
    expect(available).toEqual(['u1-l1']);
    expect(currentLesson(p)?.id).toBe('u1-l1');
  });
  it('each completed lesson unlocks exactly the next one', () => {
    const path = pathLessons();
    path.forEach((l, i) => {
      const p = done(...path.slice(0, i + 1).map((x) => x.id));
      const next = path[i + 1];
      if (next) {
        expect(isAvailable(p, next.id), `${l.id} unlocks ${next.id}`).toBe(true);
        expect(currentLesson(p)?.id).toBe(next.id);
        const after = path[i + 2];
        if (after) expect(isAvailable(p, after.id)).toBe(false);
      } else {
        expect(currentLesson(p)).toBeNull();
      }
    });
  });
  it('completed lessons stay replayable even if an earlier one is somehow missing', () => {
    const p = done('u3-l2');
    expect(isAvailable(p, 'u3-l2')).toBe(true);
    expect(isAvailable(p, 'u3-l3')).toBe(true); // previous one is completed
    expect(isAvailable(p, 'u3-l4')).toBe(false);
  });
  it('currentLesson: start, middle and end', () => {
    expect(currentLesson(done())?.id).toBe('u1-l1');
    expect(currentLesson(done(...upTo('u5-l2')))?.id).toBe('u5-l3');
    expect(currentLesson(done(...pathLessons().map((l) => l.id)))).toBeNull();
  });
  it('currentLesson skips lessons that were completed by a checkpoint', () => {
    const p = done(...upTo('u4-l5'), 'cp-a');
    expect(currentLesson(p)?.id).toBe('u5-l1');
  });
  it('currentLesson ignores non-contiguous completion (cp-b alone does not skip units 1-4)', () => {
    const p = done('cp-b', ...level1Of(5), ...level1Of(6), ...level1Of(7));
    expect(currentLesson(p)?.id).toBe('u1-l1');
  });
  it('unknown ids, review and other junk are never available', () => {
    const p = done(...pathLessons().map((l) => l.id));
    for (const id of ['review', 'u99-l1', '', '__proto__', 'constructor', 'toString']) {
      expect(isAvailable(p, id), id).toBe(false);
    }
  });
  it('a lesson id like "constructor" in the record does not count as completing anything', () => {
    const p = emptyProgress('2026-10-01');
    expect(isCompleted(p, 'constructor')).toBe(false);
    expect(isCompleted(p, 'toString')).toBe(false);
    expect(isCompleted(p, '__proto__')).toBe(false);
  });
});

describe('checkpoints', () => {
  it('are always available, even on empty progress', () => {
    const p = emptyProgress('2026-10-01');
    for (const id of ['cp-a', 'cp-b', 'cp-c']) expect(isAvailable(p, id)).toBe(true);
  });
});

describe('keyboardUnlocked', () => {
  it('is false at the start and before u4-l5', () => {
    expect(keyboardUnlocked(done())).toBe(false);
    expect(keyboardUnlocked(done(...upTo('u4-l4')))).toBe(false);
  });
  it('is true after u4-l5', () => {
    expect(keyboardUnlocked(done(...upTo('u4-l5')))).toBe(true);
  });
  it('is true after passing cp-a (which completes u4-l5)', () => {
    const p = done('cp-a', ...level1Of(1), ...level1Of(2), ...level1Of(3), ...level1Of(4));
    expect(keyboardUnlocked(p)).toBe(true);
  });
  it('is false after cp-b/cp-c records alone (cp-a was not passed)', () => {
    expect(keyboardUnlocked(done('cp-b'))).toBe(false);
  });
});

describe('levels 2 and 3', () => {
  it('are locked until the keyboard is unlocked, even if the unit is done', () => {
    // u2 complete via cp-b-like partial data but u4-l5 missing
    const p = done(...level1Of(1), ...level1Of(2));
    expect(isLevelAvailable(p, 2, 2)).toBe(false);
    expect(isAvailable(p, 'u2-lv2-a')).toBe(false);
  });
  it('level 2 of unit U needs the keyboard AND all level-1 lessons of U', () => {
    const base = upTo('u4-l5');
    const p = done(...base);
    for (const u of [2, 3, 4]) {
      expect(isAvailable(p, `u${String(u)}-lv2-a`)).toBe(true);
      expect(isAvailable(p, `u${String(u)}-lv2-b`)).toBe(true);
      expect(isLevelAvailable(p, u, 2)).toBe(true);
    }
    // unit 5 not finished yet
    expect(isAvailable(p, 'u5-lv2-a')).toBe(false);
    // unit 3 level 1 missing one lesson -> level 2 locked
    const partial = done(...base.filter((id) => id !== 'u3-l2'));
    expect(isAvailable(partial, 'u3-lv2-a')).toBe(false);
    expect(isAvailable(partial, 'u2-lv2-a')).toBe(true);
  });
  it('level 3 needs both level-2 lessons of that unit', () => {
    const base = upTo('u4-l5');
    expect(isAvailable(done(...base), 'u2-lv3-a')).toBe(false);
    expect(isAvailable(done(...base, 'u2-lv2-a'), 'u2-lv3-a')).toBe(false);
    expect(isAvailable(done(...base, 'u2-lv2-a', 'u2-lv2-b'), 'u2-lv3-a')).toBe(true);
    expect(isAvailable(done(...base, 'u2-lv2-a', 'u2-lv2-b'), 'u2-lv3-b')).toBe(true);
    expect(isAvailable(done(...base, 'u2-lv2-a', 'u2-lv2-b'), 'u3-lv3-a')).toBe(false);
    expect(isLevelAvailable(done(...base, 'u2-lv2-a', 'u2-lv2-b'), 2, 3)).toBe(true);
  });
  it('level lessons never become "current"', () => {
    const p = done(...upTo('u4-l5'), ...ids(2, 2));
    expect(currentLesson(p)?.id).toBe('u5-l1');
  });
  it('units 1 and 11 have no levels', () => {
    const p = done(...pathLessons().map((l) => l.id));
    for (const u of [1, 11]) {
      expect(isLevelAvailable(p, u, 2)).toBe(false);
      expect(isLevelAvailable(p, u, 3)).toBe(false);
    }
    expect(isAvailable(p, 'u1-lv2-a')).toBe(false);
    expect(isAvailable(p, 'u11-lv2-a')).toBe(false);
  });
});

describe('unitLevel', () => {
  it('is 0 until level 1 is done, then climbs with levels 2 and 3', () => {
    const base = upTo('u4-l5');
    expect(unitLevel(done(), 2)).toBe(0);
    expect(unitLevel(done('u2-l1', 'u2-l2'), 2)).toBe(0);
    expect(unitLevel(done(...base), 2)).toBe(1);
    expect(unitLevel(done(...base, 'u2-lv2-a'), 2)).toBe(1);
    expect(unitLevel(done(...base, ...ids(2, 2)), 2)).toBe(2);
    expect(unitLevel(done(...base, ...ids(2, 2), 'u2-lv3-a'), 2)).toBe(2);
    expect(unitLevel(done(...base, ...ids(2, 2), ...ids(2, 3)), 2)).toBe(3);
  });
  it('units 1 and 11 top out at level 1', () => {
    const all = done(...pathLessons().map((l) => l.id));
    expect(unitLevel(all, 1)).toBe(1);
    expect(unitLevel(all, 11)).toBe(1);
    expect(unitLevel(done(), 11)).toBe(0);
  });
  it('an unknown unit is level 0', () => {
    expect(unitLevel(done(...pathLessons().map((l) => l.id)), 42)).toBe(0);
  });
  it('level 3 completion without level 2 does not count (needs the climb)', () => {
    const base = upTo('u4-l5');
    expect(unitLevel(done(...base, ...ids(2, 3)), 2)).toBe(1);
  });
});

describe('reviewAvailable', () => {
  const card = (): CardState => ({
    box: 1,
    lastSeenDay: '2026-10-01',
    lastPromotedDay: null,
    seen: 1,
    correct: 1,
    avgMs: 1000,
  });
  it('needs at least 3 cards', () => {
    const p = emptyProgress('2026-10-01');
    expect(reviewAvailable(p)).toBe(false);
    p.cards['treble-C4'] = card();
    p.cards['treble-G4'] = card();
    expect(reviewAvailable(p)).toBe(false);
    p.cards['treble-C5'] = card();
    expect(reviewAvailable(p)).toBe(true);
    p.cards['bass-C3'] = card();
    expect(reviewAvailable(p)).toBe(true);
  });
});

describe('coverage of every id', () => {
  it('every lesson id is available once all prerequisites are done, and none before', () => {
    const everything = done(...allLessonIds());
    for (const id of allLessonIds()) expect(isAvailable(everything, id), id).toBe(true);
    const nothing = emptyProgress('2026-10-01');
    const open = allLessonIds().filter((id) => isAvailable(nothing, id));
    expect(open.sort()).toEqual(['cp-a', 'cp-b', 'cp-c', 'u1-l1']);
  });
  it('unit list is intact', () => {
    expect(UNITS).toHaveLength(11);
  });
});

describe('M4 gate (TODO M6: remove with MAX_UNIT_M4)', () => {
  const upTo = (lastId: string): Progress => {
    const p = emptyProgress('2026-10-01');
    for (const l of pathLessons()) {
      p.lessons[l.id] = {
        timesCompleted: 1,
        bestAccuracy: 100,
        firstCompletedDay: '2026-10-01',
        lastCompletedDay: '2026-10-01',
      };
      if (l.id === lastId) break;
    }
    return p;
  };

  it('allows units 1–4 level 1 in order and nothing else', () => {
    const fresh = emptyProgress('2026-10-01');
    expect(MAX_UNIT_M4).toBe(4);
    expect(isPlayable(fresh, 'u1-l1')).toBe(true);
    expect(isPlayable(fresh, 'u1-l2')).toBe(false);
    expect(currentPlayableLesson(fresh)?.id).toBe('u1-l1');
    expect(isPlayable(fresh, 'nope')).toBe(false);
    expect(isPlayable(fresh, 'cp-a')).toBe(false);
  });

  it('stops after unit 4 even though unit 5 is available in the domain', () => {
    const p = upTo('u4-l5');
    expect(isAvailable(p, 'u5-l1')).toBe(true);
    expect(isPlayable(p, 'u5-l1')).toBe(false);
    expect(currentPlayableLesson(p)).toBeNull();
    expect(isPlayable(p, 'u4-l5')).toBe(true); // replay
  });

  it('does not offer level 2 or 3 lessons yet', () => {
    const p = upTo('u4-l5');
    expect(isAvailable(p, 'u2-lv2-a')).toBe(true);
    expect(isPlayable(p, 'u2-lv2-a')).toBe(false);
  });

  it('keeps practice and levels 2–3 hidden even when the domain would allow them', () => {
    const p = upTo('u4-l5');
    for (const id of ['treble-C4', 'treble-G4', 'treble-C5']) {
      p.cards[id as 'treble-C4'] = {
        box: 1,
        lastSeenDay: '2026-10-01',
        lastPromotedDay: null,
        seen: 1,
        correct: 1,
        avgMs: 1000,
      };
    }
    expect(reviewAvailable(p)).toBe(true);
    expect(isReviewPlayable(p)).toBe(false);
    expect(keyboardUnlocked(p)).toBe(true);
    expect(levelsPlayable()).toBe(false);
  });
});

describe('nextLevelLesson', () => {
  it('opens lesson a first, then b, then a again when both are done', () => {
    const base = upTo('u4-l5');
    expect(nextLevelLesson(done(...base), 2, 2)?.id).toBe('u2-lv2-a');
    expect(nextLevelLesson(done(...base, 'u2-lv2-a'), 2, 2)?.id).toBe('u2-lv2-b');
    expect(nextLevelLesson(done(...base, 'u2-lv2-b'), 2, 2)?.id).toBe('u2-lv2-a');
    expect(nextLevelLesson(done(...base, 'u2-lv2-a', 'u2-lv2-b'), 2, 2)?.id).toBe('u2-lv2-a');
  });
  it('works the same for level 3', () => {
    const base = [...upTo('u4-l5'), 'u2-lv2-a', 'u2-lv2-b'];
    expect(nextLevelLesson(done(...base), 2, 3)?.id).toBe('u2-lv3-a');
    expect(nextLevelLesson(done(...base, 'u2-lv3-a'), 2, 3)?.id).toBe('u2-lv3-b');
  });
  it('is null for units without levels 2 and 3', () => {
    expect(nextLevelLesson(done(), 1, 2)).toBeNull();
    expect(nextLevelLesson(done(), 11, 3)).toBeNull();
  });
});

describe('unitLevelCount', () => {
  it('is 1 for units 1 and 11 and 3 for the others', () => {
    expect(UNITS.map((u) => unitLevelCount(u.n))).toEqual([1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1]);
  });
});
