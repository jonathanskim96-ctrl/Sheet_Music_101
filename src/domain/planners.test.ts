import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ALL_CARDS } from './cards';
import { pathLessons } from './curriculum';
import {
  planCompleteSession,
  planFlag,
  planMarkExported,
  planReplaceAll,
  planReset,
  planSettings,
} from './planners';
import { emptyProgress, type Progress } from './progress';
import type { FirstAttempt, SessionResult } from './session';
import { updateCard, type CardState } from './srs';
import { clone, deepFreeze, progressArb, sampleProgress } from './testkit';
import { keyboardUnlocked, isCompleted } from './unlocks';
import { checkProgress } from './validate';

const NOW = new Date(2026, 9, 12, 14, 30); // 12 Oct 2026, local
const TODAY = '2026-10-12';

function result(over: Partial<SessionResult> & { attempts?: FirstAttempt[] } = {}): SessionResult {
  const firstAttempts: FirstAttempt[] = over.attempts ?? [
    { originalIndex: 0, card: 'treble-C4', correct: true, ms: 2000 },
    { originalIndex: 1, card: 'treble-G4', correct: false, ms: 3000 },
    { originalIndex: 2, card: null, correct: true, ms: 1000 },
  ];
  const correctFirstTry = firstAttempts.filter((a) => a.correct).length;
  const total = firstAttempts.length;
  const rest: Partial<SessionResult> = { ...over };
  delete (rest as { attempts?: unknown }).attempts;
  return {
    context: { kind: 'lesson', lessonId: 'u2-l1' },
    firstAttempts,
    total,
    correctFirstTry,
    accuracy: Math.round((100 * correctFirstTry) / total),
    perfect: correctFirstTry === total,
    bestCombo: 2,
    durationMs: 60_000,
    ...rest,
  };
}
const perfectAttempts = (n: number): FirstAttempt[] =>
  Array.from({ length: n }, (_, i) => ({
    originalIndex: i,
    card: 'treble-C4',
    correct: true,
    ms: 1000,
  }));
const passedCp = (id: 'cp-a' | 'cp-b' | 'cp-c', correct = 14): SessionResult => {
  const attempts: FirstAttempt[] = Array.from({ length: 15 }, (_, i) => ({
    originalIndex: i,
    card: ALL_CARDS[i] ?? null,
    correct: i < correct,
    ms: 1500,
  }));
  return result({ attempts, context: { kind: 'checkpoint', id }, passed: correct >= 13 });
};
const strictOk = (p: Progress): void => {
  const r = checkProgress(JSON.parse(JSON.stringify(p)), 'strict');
  expect(r.issues).toEqual([]);
  expect(r.progress).not.toBeNull();
};

describe('planCompleteSession: cards', () => {
  it('applies updateCard to each first attempt that has a card, in order', () => {
    const p = emptyProgress('2026-10-01');
    const attempts: FirstAttempt[] = [
      { originalIndex: 0, card: 'treble-C4', correct: true, ms: 2000 },
      { originalIndex: 1, card: 'treble-C4', correct: true, ms: 2500 },
      { originalIndex: 2, card: 'treble-G4', correct: false, ms: 9000 },
      { originalIndex: 3, card: null, correct: true, ms: 100 },
    ];
    const out = planCompleteSession(p, result({ attempts }), NOW);
    let c4: CardState | undefined = undefined;
    c4 = updateCard(c4, true, 2000, TODAY);
    c4 = updateCard(c4, true, 2500, TODAY);
    expect(out.cards['treble-C4']).toEqual(c4);
    expect(out.cards['treble-C4']?.box).toBe(2); // promoted once, not twice, in one day
    expect(out.cards['treble-G4']).toEqual(updateCard(undefined, false, 9000, TODAY));
    expect(Object.keys(out.cards).sort()).toEqual(['treble-C4', 'treble-G4']);
  });
  it('builds on the existing card state', () => {
    const p = sampleProgress();
    const prev = p.cards['treble-C4'] as CardState;
    const out = planCompleteSession(
      p,
      result({ attempts: [{ originalIndex: 0, card: 'treble-C4', correct: false, ms: 500 }] }),
      NOW,
    );
    expect(out.cards['treble-C4']).toEqual(updateCard(prev, false, 500, TODAY));
    expect(out.cards['bass-F3']).toEqual(p.cards['bass-F3']); // untouched
  });
});

describe('planCompleteSession: XP', () => {
  const xpGain = (r: SessionResult): number =>
    planCompleteSession(emptyProgress('2026-10-01'), r, NOW).xp;
  it('+10 for a lesson, +5 more when perfect', () => {
    expect(xpGain(result())).toBe(10);
    expect(xpGain(result({ attempts: perfectAttempts(5) }))).toBe(15);
  });
  it('a review is +10 (+5 perfect)', () => {
    expect(xpGain(result({ context: { kind: 'review' } }))).toBe(10);
    expect(xpGain(result({ context: { kind: 'review' }, attempts: perfectAttempts(10) }))).toBe(15);
  });
  it('a passed checkpoint is +10 +20 (+5 when perfect); a failed one is +10', () => {
    expect(xpGain(passedCp('cp-a', 13))).toBe(30);
    expect(xpGain(passedCp('cp-a', 14))).toBe(30);
    expect(xpGain(passedCp('cp-a', 15))).toBe(35);
    expect(xpGain(passedCp('cp-a', 12))).toBe(10);
  });
  it('XP adds to the existing total and never decreases', () => {
    const p = sampleProgress();
    expect(planCompleteSession(p, result(), NOW).xp).toBe(145);
  });
  it('XP is capped so the document stays valid', () => {
    const p = { ...sampleProgress(), xp: 999_999_995 };
    const out = planCompleteSession(p, result({ attempts: perfectAttempts(3) }), NOW);
    expect(out.xp).toBe(1_000_000_000);
    strictOk(out);
  });
});

describe('planCompleteSession: lesson records', () => {
  it('creates a record on first completion', () => {
    const out = planCompleteSession(emptyProgress('2026-10-01'), result(), NOW);
    expect(out.lessons['u2-l1']).toEqual({
      timesCompleted: 1,
      bestAccuracy: 67,
      firstCompletedDay: TODAY,
      lastCompletedDay: TODAY,
    });
  });
  it('upserts: times+1, best accuracy is the max, first day kept, last day updated', () => {
    const p = sampleProgress(); // u1-l1: 2 times, best 100, first 10-01, last 10-03
    const worse = planCompleteSession(
      p,
      result({ context: { kind: 'lesson', lessonId: 'u1-l1' } }),
      NOW,
    );
    expect(worse.lessons['u1-l1']).toEqual({
      timesCompleted: 3,
      bestAccuracy: 100,
      firstCompletedDay: '2026-10-01',
      lastCompletedDay: TODAY,
    });
    const low = clone(p);
    (low.lessons['u1-l1'] as { bestAccuracy: number }).bestAccuracy = 50;
    const better = planCompleteSession(
      low,
      result({ context: { kind: 'lesson', lessonId: 'u1-l1' } }),
      NOW,
    );
    expect(better.lessons['u1-l1']?.bestAccuracy).toBe(67);
  });
  it('keeps other lesson records and does not touch them', () => {
    const p = sampleProgress();
    const out = planCompleteSession(p, result(), NOW);
    expect(out.lessons['u1-l1']).toEqual(p.lessons['u1-l1']);
    expect(Object.keys(out.lessons).sort()).toEqual(['u1-l1', 'u2-l1']);
  });
  it('reviews add no lesson record but count in reviewsDone', () => {
    const out = planCompleteSession(sampleProgress(), result({ context: { kind: 'review' } }), NOW);
    expect(Object.keys(out.lessons)).toEqual(['u1-l1']);
    expect(out.totals.reviewsDone).toBe(2);
    const lesson = planCompleteSession(sampleProgress(), result(), NOW);
    expect(lesson.totals.reviewsDone).toBe(1);
  });
  it('a lesson id called "constructor" cannot confuse the upsert', () => {
    const out = planCompleteSession(
      emptyProgress('2026-10-01'),
      result({ context: { kind: 'lesson', lessonId: 'constructor' } }),
      NOW,
    );
    expect(out.lessons['constructor']?.timesCompleted).toBe(1);
  });
});

describe('planCompleteSession: checkpoints', () => {
  it('passing cp-a records it and completes every lesson of units 1-4 not yet done', () => {
    const p = emptyProgress('2026-10-01');
    p.lessons['u1-l1'] = {
      timesCompleted: 3,
      bestAccuracy: 88,
      firstCompletedDay: '2026-10-01',
      lastCompletedDay: '2026-10-02',
    };
    const out = planCompleteSession(p, passedCp('cp-a'), NOW);
    expect(out.lessons['cp-a']).toMatchObject({ timesCompleted: 1, bestAccuracy: 93 });
    expect(out.lessons['u1-l1']).toEqual(p.lessons['u1-l1']); // already done: untouched
    const skipped = pathLessons().filter((l) => l.unit <= 4 && l.id !== 'u1-l1');
    expect(skipped).toHaveLength(15);
    for (const l of skipped) {
      expect(out.lessons[l.id]).toEqual({
        timesCompleted: 0,
        bestAccuracy: 0,
        firstCompletedDay: TODAY,
        lastCompletedDay: TODAY,
      });
    }
    for (const l of pathLessons().filter((x) => x.unit > 4))
      expect(isCompleted(out, l.id)).toBe(false);
    expect(keyboardUnlocked(out)).toBe(true);
  });
  it('passing cp-b completes units 5-7 only (not units 1-4)', () => {
    const out = planCompleteSession(emptyProgress('2026-10-01'), passedCp('cp-b'), NOW);
    const done = pathLessons()
      .filter((l) => isCompleted(out, l.id))
      .map((l) => l.unit);
    expect([...new Set(done)]).toEqual([5, 6, 7]);
    expect(isCompleted(out, 'cp-b')).toBe(true);
    expect(keyboardUnlocked(out)).toBe(false);
  });
  it('passing cp-c completes units 1-10 but not unit 11', () => {
    const out = planCompleteSession(emptyProgress('2026-10-01'), passedCp('cp-c'), NOW);
    const units = new Set(
      pathLessons()
        .filter((l) => isCompleted(out, l.id))
        .map((l) => l.unit),
    );
    expect([...units].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it('failing a checkpoint adds no lesson records at all, but cards, XP and totals still update', () => {
    const p = emptyProgress('2026-10-01');
    const out = planCompleteSession(p, passedCp('cp-a', 10), NOW);
    expect(out.lessons).toEqual({});
    expect(out.xp).toBe(10);
    expect(Object.keys(out.cards).length).toBeGreaterThan(0);
    expect(out.totals).toMatchObject({
      questionsAnswered: 15,
      correctFirstTry: 10,
      lessonsDone: 1,
    });
    expect(out.daysPracticed).toEqual([TODAY]);
  });
  it('re-passing a checkpoint bumps its record without resetting the skipped lessons', () => {
    const first = planCompleteSession(emptyProgress('2026-10-01'), passedCp('cp-a'), NOW);
    const again = planCompleteSession(first, passedCp('cp-a', 15), new Date(2026, 9, 13, 9, 0));
    expect(again.lessons['cp-a']).toMatchObject({
      timesCompleted: 2,
      bestAccuracy: 100,
      firstCompletedDay: TODAY,
      lastCompletedDay: '2026-10-13',
    });
    expect(again.lessons['u1-l1']?.timesCompleted).toBe(0);
    expect(again.lessons['u1-l1']?.firstCompletedDay).toBe(TODAY);
  });
});

describe('planCompleteSession: days and totals', () => {
  it('same day: lessonsDone increments; new day: it rolls over to 1', () => {
    const p = sampleProgress(); // today { 2026-10-03, 1 }
    const sameDay = planCompleteSession(p, result(), new Date(2026, 9, 3, 20, 0));
    expect(sameDay.today).toEqual({ day: '2026-10-03', lessonsDone: 2 });
    const next = planCompleteSession(p, result(), NOW);
    expect(next.today).toEqual({ day: TODAY, lessonsDone: 1 });
    const third = planCompleteSession(next, result(), NOW);
    expect(third.today).toEqual({ day: TODAY, lessonsDone: 2 });
  });
  it('uses the local date, so a late-night session counts for that evening', () => {
    const out = planCompleteSession(
      emptyProgress('2026-10-01'),
      result(),
      new Date(2026, 9, 12, 23, 59),
    );
    expect(out.today.day).toBe('2026-10-12');
    expect(out.daysPracticed).toEqual(['2026-10-12']);
  });
  it('daysPracticed stays sorted and unique, even if the clock goes backwards', () => {
    let p = sampleProgress(); // 10-01, 10-02, 10-03
    p = planCompleteSession(p, result(), new Date(2026, 9, 10));
    p = planCompleteSession(p, result(), new Date(2026, 9, 10));
    p = planCompleteSession(p, result(), new Date(2026, 8, 20)); // earlier than everything
    p = planCompleteSession(p, result(), new Date(2026, 9, 2)); // already present
    expect(p.daysPracticed).toEqual([
      '2026-09-20',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-10',
    ]);
  });
  it('totals add questions, first-try correct and lessons', () => {
    const out = planCompleteSession(sampleProgress(), result(), NOW);
    expect(out.totals).toEqual({
      questionsAnswered: 43,
      correctFirstTry: 37,
      reviewsDone: 1,
      lessonsDone: 5,
    });
  });
  it('leaves settings and flags alone', () => {
    const p = sampleProgress();
    const out = planCompleteSession(p, result(), NOW);
    expect(out.settings).toEqual(p.settings);
    expect(out.flags).toEqual(p.flags);
    expect(out.createdDay).toBe(p.createdDay);
  });
});

describe('purity', () => {
  it('never mutates a deep-frozen input (every planner)', () => {
    const p = deepFreeze(sampleProgress());
    const frozenResult = deepFreeze(result());
    expect(() => planCompleteSession(p, frozenResult, NOW)).not.toThrow();
    expect(() => planCompleteSession(p, deepFreeze(passedCp('cp-a')), NOW)).not.toThrow();
    expect(() => planSettings(p, { soundOn: true })).not.toThrow();
    expect(() => planFlag(p, 'welcomeSeen', false)).not.toThrow();
    expect(() => planMarkExported(p, TODAY)).not.toThrow();
    expect(() => planReset(p, TODAY)).not.toThrow();
    expect(() => planReplaceAll(p, emptyProgress(TODAY))).not.toThrow();
  });
  it('returns new top-level objects and leaves the input equal to a pre-call copy', () => {
    const p = sampleProgress();
    const before = clone(p);
    const out = planCompleteSession(p, result(), NOW);
    expect(out).not.toBe(p);
    expect(p).toEqual(before);
  });
});

describe('other planners', () => {
  it('planSettings merges a patch', () => {
    const p = sampleProgress();
    expect(planSettings(p, { soundOn: true }).settings).toEqual({ soundOn: true, dailyGoal: 2 });
    expect(planSettings(p, { dailyGoal: 3 }).settings).toEqual({ soundOn: false, dailyGoal: 3 });
    expect(planSettings(p, {}).settings).toEqual(p.settings);
    expect(planSettings(p, { soundOn: true, dailyGoal: 1 }).settings).toEqual({
      soundOn: true,
      dailyGoal: 1,
    });
    expect(planSettings(p, { dailyGoal: 3 }).xp).toBe(p.xp);
  });
  it('planFlag sets one flag and leaves the others', () => {
    const p = sampleProgress();
    const out = planFlag(p, 'keyboardUnlockSeen', true);
    expect(out.flags).toEqual({ ...p.flags, keyboardUnlockSeen: true });
    expect(planFlag(p, 'installCardDismissedDay', null).flags.installCardDismissedDay).toBeNull();
    expect(planFlag(p, 'installCardDismissedDay', TODAY).flags.installCardDismissedDay).toBe(TODAY);
    expect(planFlag(p, 'welcomeSeen', false).flags.welcomeSeen).toBe(false);
  });
  it('planMarkExported sets lastExportDay', () => {
    expect(planMarkExported(sampleProgress(), TODAY).flags.lastExportDay).toBe(TODAY);
  });
  it('planReplaceAll returns the incoming document, planReset a fresh one', () => {
    const incoming = sampleProgress();
    expect(planReplaceAll(emptyProgress(TODAY), incoming)).toEqual(incoming);
    expect(planReset(sampleProgress(), TODAY)).toEqual(emptyProgress(TODAY));
  });
});

describe('property: output always passes strict validation, XP never decreases', () => {
  const attemptArb: fc.Arbitrary<FirstAttempt> = fc.record({
    originalIndex: fc.nat(30),
    card: fc.option(fc.constantFrom(...ALL_CARDS), { nil: null }),
    correct: fc.boolean(),
    ms: fc.integer({ min: 0, max: 70_000 }),
  });
  const resultArb: fc.Arbitrary<SessionResult> = fc
    .record({
      attempts: fc.array(attemptArb, { minLength: 1, maxLength: 20 }),
      context: fc.oneof(
        fc.constantFrom(
          { kind: 'lesson', lessonId: 'u2-l1' } as const,
          { kind: 'lesson', lessonId: 'u4-lv3-b' } as const,
          { kind: 'review' } as const,
          { kind: 'checkpoint', id: 'cp-a' } as const,
          { kind: 'checkpoint', id: 'cp-b' } as const,
          { kind: 'checkpoint', id: 'cp-c' } as const,
        ),
      ),
      passed: fc.boolean(),
    })
    .map(({ attempts, context, passed }) =>
      result({
        attempts,
        context,
        ...(context.kind === 'checkpoint' ? { passed } : {}),
      }),
    );
  const nowArb = fc
    .integer({ min: Date.UTC(2020, 0, 2), max: Date.UTC(2035, 11, 30) })
    .map((t) => new Date(t));

  it('holds for random progress × random results × random dates, applied repeatedly', () => {
    fc.assert(
      fc.property(
        progressArb,
        fc.array(fc.tuple(resultArb, nowArb), { minLength: 1, maxLength: 4 }),
        (p0, steps) => {
          let p = deepFreeze(clone(p0));
          for (const [r, now] of steps) {
            const next = planCompleteSession(p, r, now);
            const check = checkProgress(JSON.parse(JSON.stringify(next)), 'strict');
            if (check.progress === null) throw new Error(check.issues.join('; '));
            expect(next.xp).toBeGreaterThanOrEqual(p.xp);
            expect(next.totals.lessonsDone).toBe(p.totals.lessonsDone + 1);
            expect(next.daysPracticed).toEqual([...new Set(next.daysPracticed)].sort());
            expect(Object.keys(next.cards).length).toBeGreaterThanOrEqual(
              Object.keys(p.cards).length,
            );
            for (const id of Object.keys(p.lessons)) expect(next.lessons[id]).toBeDefined();
            p = deepFreeze(clone(next));
          }
          return true;
        },
      ),
      { numRuns: 150 },
    );
  });
  it('settings, flags and replace planners also keep documents valid', () => {
    fc.assert(
      fc.property(progressArb, fc.constantFrom<1 | 2 | 3>(1, 2, 3), fc.boolean(), (p, goal, on) => {
        strictOk(planSettings(p, { dailyGoal: goal, soundOn: on }));
        strictOk(planFlag(p, 'welcomeSeen', on));
        strictOk(planMarkExported(p, TODAY));
        strictOk(planReset(p, TODAY));
      }),
      { numRuns: 60 },
    );
  });
});
