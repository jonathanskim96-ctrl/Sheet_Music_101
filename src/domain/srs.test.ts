import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  INTERVAL_DAYS,
  SLOW_MS,
  isDue,
  masteryOf,
  updateCard,
  type Box,
  type CardState,
} from './srs';

const T = '2026-10-12';
const card = (over: Partial<CardState> = {}): CardState => ({
  box: 1,
  lastSeenDay: '2026-10-01',
  lastPromotedDay: null,
  seen: 4,
  correct: 3,
  avgMs: 3000,
  ...over,
});

describe('updateCard (SPEC 4.5 rules)', () => {
  it('rule 1: starts a new card in box 1 and counts the answer', () => {
    const c = updateCard(undefined, true, 2000, T);
    expect(c).toEqual({
      box: 2, // first correct fast answer promotes box 1 -> 2
      lastSeenDay: T,
      lastPromotedDay: T,
      seen: 1,
      correct: 1,
      avgMs: 2000,
    });
  });
  it('rule 1: a wrong first answer stays in box 1 and is not promoted', () => {
    const c = updateCard(undefined, false, 2000, T);
    expect(c).toMatchObject({ box: 1, lastPromotedDay: null, seen: 1, correct: 0, avgMs: 2000 });
  });
  it('rule 2: seen always rises, correct only for correct answers', () => {
    const right = updateCard(card(), true, 1000, T);
    expect(right.seen).toBe(5);
    expect(right.correct).toBe(4);
    const wrong = updateCard(card(), false, 1000, T);
    expect(wrong.seen).toBe(5);
    expect(wrong.correct).toBe(3);
  });
  it('rule 3: avgMs is 0.7 old + 0.3 new, rounded; new time is clamped', () => {
    expect(updateCard(card({ avgMs: 3000 }), true, 1000, T).avgMs).toBe(2400);
    expect(updateCard(card({ avgMs: 3001 }), true, 1000, T).avgMs).toBe(
      Math.round(0.7 * 3001 + 300),
    );
    expect(updateCard(card({ avgMs: 0 }), true, 1_000_000, T).avgMs).toBe(18_000);
    expect(updateCard(card({ avgMs: 0 }), true, -5, T).avgMs).toBe(0);
    expect(updateCard(undefined, true, 1_000_000, T).avgMs).toBe(60_000);
    expect(updateCard(undefined, true, Number.NaN, T).avgMs).toBe(0);
  });
  it('rule 4: a fast correct answer promotes one box', () => {
    const c = updateCard(card({ box: 2 }), true, SLOW_MS, T);
    expect(c.box).toBe(3);
    expect(c.lastPromotedDay).toBe(T);
  });
  it('rule 4: a slow correct answer does not promote', () => {
    const c = updateCard(card({ box: 2 }), true, SLOW_MS + 1, T);
    expect(c.box).toBe(2);
    expect(c.lastPromotedDay).toBeNull();
    expect(c.correct).toBe(4); // still counted as correct
  });
  it('rule 4: promotes at most once per day', () => {
    const first = updateCard(card({ box: 2 }), true, 1000, T);
    const second = updateCard(first, true, 1000, T);
    expect(first.box).toBe(3);
    expect(second.box).toBe(3);
    const nextDay = updateCard(second, true, 1000, '2026-10-13');
    expect(nextDay.box).toBe(4);
  });
  it('rule 4: box 5 stays at 5', () => {
    expect(updateCard(card({ box: 5 }), true, 1000, T).box).toBe(5);
  });
  it('rule 5: a wrong answer drops two boxes, never below 1', () => {
    expect(updateCard(card({ box: 5 }), false, 1000, T).box).toBe(3);
    expect(updateCard(card({ box: 3 }), false, 1000, T).box).toBe(1);
    expect(updateCard(card({ box: 2 }), false, 1000, T).box).toBe(1);
    expect(updateCard(card({ box: 1 }), false, 1000, T).box).toBe(1);
  });
  it('rule 5: a wrong answer after a promotion today still drops', () => {
    const up = updateCard(card({ box: 3 }), true, 1000, T);
    const down = updateCard(up, false, 1000, T);
    expect(down.box).toBe(2);
  });
  it('rule 6: lastSeenDay is today and the input is not mutated', () => {
    const prev = Object.freeze(card());
    const next = updateCard(prev, true, 1000, T);
    expect(next.lastSeenDay).toBe(T);
    expect(next).not.toBe(prev);
    expect(prev.seen).toBe(4);
  });
  it('property: box stays 1..5 and correct <= seen over any sequence', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ok: fc.boolean(),
            ms: fc.integer({ min: -100, max: 100_000 }),
            day: fc.integer({ min: 0, max: 5 }),
          }),
          { maxLength: 60 },
        ),
        (steps) => {
          let c: CardState | undefined;
          for (const s of steps) {
            c = updateCard(c, s.ok, s.ms, `2026-10-${String(10 + s.day).padStart(2, '0')}`);
            if (c.box < 1 || c.box > 5) return false;
            if (c.correct > c.seen) return false;
            if (!Number.isInteger(c.avgMs) || c.avgMs < 0 || c.avgMs > 60_000) return false;
          }
          return true;
        },
      ),
    );
  });
});

describe('isDue', () => {
  const boxes: Box[] = [1, 2, 3, 4, 5];
  it.each(boxes)('box %i is due exactly at its interval', (box) => {
    const interval = INTERVAL_DAYS[box];
    const seen = '2026-10-01';
    const dayAt = (n: number): string => `2026-10-${String(1 + n).padStart(2, '0')}`;
    expect(isDue(card({ box, lastSeenDay: seen }), dayAt(interval))).toBe(true);
    expect(isDue(card({ box, lastSeenDay: seen }), dayAt(interval + 1))).toBe(true);
    if (interval > 0)
      expect(isDue(card({ box, lastSeenDay: seen }), dayAt(interval - 1))).toBe(false);
  });
  it('intervals are 0, 1, 3, 7, 21', () => {
    expect(INTERVAL_DAYS).toEqual({ 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 });
  });
  it('box 1 is due even on the same day', () => {
    expect(isDue(card({ box: 1, lastSeenDay: T }), T)).toBe(true);
    expect(isDue(card({ box: 2, lastSeenDay: T }), T)).toBe(false);
  });
});

describe('masteryOf', () => {
  it('maps boxes to labels', () => {
    expect(masteryOf(undefined)).toBe('new');
    expect(masteryOf(card({ box: 1 }))).toBe('learning');
    expect(masteryOf(card({ box: 2 }))).toBe('learning');
    expect(masteryOf(card({ box: 3 }))).toBe('almost');
    expect(masteryOf(card({ box: 4 }))).toBe('known');
    expect(masteryOf(card({ box: 5 }))).toBe('known');
  });
});
