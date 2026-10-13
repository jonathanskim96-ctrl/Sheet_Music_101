// Shared helpers for domain tests only (never imported by app code).
import fc from 'fast-check';
import { ALL_CARDS } from './cards';
import { allLessonIds } from './curriculum';
import { LETTERS } from './notes';
import { type Progress, emptyProgress } from './progress';
import { checkAnswer, type Answer, type ChoiceValue, type Question } from './questions';
import type { Box, CardState } from './srs';

/** Recursively freezes a value so any mutation attempt throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/** A deep copy through JSON (progress documents are plain JSON). */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** A small, valid, non-empty progress document. */
export function sampleProgress(): Progress {
  const p = emptyProgress('2026-10-01');
  p.xp = 135;
  p.settings = { soundOn: false, dailyGoal: 2 };
  p.lessons['u1-l1'] = {
    timesCompleted: 2,
    bestAccuracy: 100,
    firstCompletedDay: '2026-10-01',
    lastCompletedDay: '2026-10-03',
  };
  p.cards['treble-C4'] = {
    box: 3,
    lastSeenDay: '2026-10-03',
    lastPromotedDay: '2026-10-03',
    seen: 8,
    correct: 7,
    avgMs: 2500,
  };
  p.cards['bass-F3'] = {
    box: 1,
    lastSeenDay: '2026-10-02',
    lastPromotedDay: null,
    seen: 2,
    correct: 1,
    avgMs: 4100,
  };
  p.daysPracticed = ['2026-10-01', '2026-10-02', '2026-10-03'];
  p.today = { day: '2026-10-03', lessonsDone: 1 };
  p.flags = {
    welcomeSeen: true,
    keyboardUnlockSeen: false,
    installCardDismissedDay: '2026-10-02',
    lastExportDay: null,
  };
  p.totals = { questionsAnswered: 40, correctFirstTry: 35, reviewsDone: 1, lessonsDone: 4 };
  return p;
}

const dayArb = fc
  .integer({ min: Date.UTC(2020, 0, 1) / 86_400_000, max: Date.UTC(2035, 11, 31) / 86_400_000 })
  .map((n) => new Date(n * 86_400_000).toISOString().slice(0, 10));

const cardStateArb: fc.Arbitrary<CardState> = fc
  .record({
    box: fc.constantFrom<Box>(1, 2, 3, 4, 5),
    lastSeenDay: dayArb,
    lastPromotedDay: fc.option(dayArb, { nil: null }),
    seen: fc.integer({ min: 0, max: 500 }),
    avgMs: fc.integer({ min: 0, max: 60_000 }),
  })
  .chain((c) => fc.integer({ min: 0, max: c.seen }).map((correct) => ({ ...c, correct })));

/** Random valid progress documents (strict-valid by construction). */
export const progressArb: fc.Arbitrary<Progress> = fc
  .record({
    createdDay: dayArb,
    soundOn: fc.boolean(),
    dailyGoal: fc.constantFrom<1 | 2 | 3>(1, 2, 3),
    xp: fc.integer({ min: 0, max: 100_000 }),
    lessonIds: fc.subarray(allLessonIds()),
    lessonRec: fc.record({
      timesCompleted: fc.integer({ min: 0, max: 20 }),
      bestAccuracy: fc.integer({ min: 0, max: 100 }),
      firstCompletedDay: dayArb,
      lastCompletedDay: dayArb,
    }),
    cardIds: fc.subarray([...ALL_CARDS]),
    cardState: cardStateArb,
    days: fc.uniqueArray(dayArb, { maxLength: 30 }),
    todayDay: dayArb,
    lessonsDone: fc.integer({ min: 0, max: 10 }),
    flagA: fc.boolean(),
    flagB: fc.boolean(),
    dismissed: fc.option(dayArb, { nil: null }),
    exported: fc.option(dayArb, { nil: null }),
    totals: fc.record({
      questionsAnswered: fc.integer({ min: 0, max: 5000 }),
      correctFirstTry: fc.integer({ min: 0, max: 5000 }),
      reviewsDone: fc.integer({ min: 0, max: 500 }),
      lessonsDone: fc.integer({ min: 0, max: 500 }),
    }),
  })
  .map((r) => {
    const p = emptyProgress(r.createdDay);
    p.settings = { soundOn: r.soundOn, dailyGoal: r.dailyGoal };
    p.xp = r.xp;
    for (const id of r.lessonIds) p.lessons[id] = { ...r.lessonRec };
    for (const id of r.cardIds) p.cards[id] = { ...r.cardState };
    p.daysPracticed = [...r.days].sort();
    p.today = { day: r.todayDay, lessonsDone: r.lessonsDone };
    p.flags = {
      welcomeSeen: r.flagA,
      keyboardUnlockSeen: r.flagB,
      installCardDismissedDay: r.dismissed,
      lastExportDay: r.exported,
    };
    p.totals = r.totals;
    return p;
  });

/** Some answer that `checkAnswer` rejects for `q` (a black key, an off-by-one letter, etc.). */
export function wrongAnswerOf(q: Question): Answer {
  const candidates: Answer[] = [
    { kind: 'key', note: 'black' },
    ...LETTERS.map((letter): Answer => ({ kind: 'letter', letter })),
    ...Array.from({ length: 41 }, (_, i): Answer => ({ kind: 'position', position: i - 20 })),
    ...CHOICE_VALUES.map((value): Answer => ({ kind: 'choice', value })),
  ];
  const hit = candidates.find((a) => !checkAnswer(q, a));
  if (!hit) throw new Error('no wrong answer found');
  return hit;
}

const CHOICE_VALUES: ChoiceValue[] = [
  'line',
  'space',
  'first',
  'second',
  'treble',
  'bass',
  'step-up',
  'step-down',
  'skip-up',
  'skip-down',
];
