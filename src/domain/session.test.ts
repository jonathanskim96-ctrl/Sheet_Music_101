import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { CardId } from './cards';
import { CHECKPOINTS, findLesson, type LessonDef } from './curriculum';
import { buildCheckpoint, buildLesson, buildReview, type LessonPlan } from './lessonBuilder';
import { emptyProgress } from './progress';
import { correctAnswerOf, type Question } from './questions';
import {
  CHECKPOINT_PASS_MARK,
  currentQuestion,
  reduce,
  resultOf,
  startSession,
  type Action,
  type SessionState,
} from './session';
import { deepFreeze, wrongAnswerOf } from './testkit';

const q = (card: CardId): Question => ({ kind: 'name-note', card, render: 'single' });

/** A hand-made plan so we control exactly which questions are asked. */
function plan(over: Partial<LessonPlan> = {}): LessonPlan {
  return {
    context: { kind: 'lesson', lessonId: 'u2-l1' },
    conceptCards: [],
    meetCards: [],
    questions: [q('treble-C4'), q('treble-G4'), q('treble-C5'), q('treble-D4'), q('treble-F4')],
    retries: true,
    ...over,
  };
}

const right = (s: SessionState, at: number): SessionState => {
  const cur = currentQuestion(s);
  if (!cur) throw new Error('no current question');
  return reduce(s, { type: 'answer', answer: correctAnswerOf(cur.q), at });
};
const wrong = (s: SessionState, at: number): SessionState => {
  const cur = currentQuestion(s);
  if (!cur) throw new Error('no current question');
  return reduce(s, { type: 'answer', answer: wrongAnswerOf(cur.q), at });
};
const next = (s: SessionState, at: number): SessionState => reduce(s, { type: 'continue', at });

describe('start phase', () => {
  it('concept cards first, then Meet cards, then questions', () => {
    const concept = startSession(
      plan({ conceptCards: ['c-landmarks'], meetCards: ['treble-C4'] }),
      0,
    );
    expect(concept.phase).toBe('concept');
    const meet = startSession(plan({ meetCards: ['treble-C4'] }), 0);
    expect(meet.phase).toBe('meet');
    const direct = startSession(plan(), 0);
    expect(direct.phase).toBe('question');
    expect(direct.index).toBe(0);
    expect(direct.queue).toHaveLength(5);
    expect(direct.queue.every((x, i) => !x.isRetry && x.originalIndex === i)).toBe(true);
  });
  it('starts with zeroed counters and the start time', () => {
    const s = startSession(plan(), 1234);
    expect(s).toMatchObject({
      combo: 0,
      bestCombo: 0,
      shownAt: 1234,
      startedAt: 1234,
      endedAt: null,
      lastAnswer: null,
      firstAttempts: [],
    });
  });
});

describe('concept and meet cards', () => {
  it('walk through every concept card, then every Meet card, then the questions', () => {
    let s = startSession(
      plan({ conceptCards: ['c-landmarks', 'c-steps'], meetCards: ['treble-C4', 'treble-G4'] }),
      0,
    );
    const seen: string[] = [`${s.phase}:${String(s.conceptIndex)}:${String(s.meetIndex)}`];
    for (let t = 1; s.phase !== 'question'; t++) {
      s = reduce(s, { type: 'next-card', at: t * 100 });
      seen.push(`${s.phase}:${String(s.conceptIndex)}:${String(s.meetIndex)}`);
    }
    expect(seen).toEqual(['concept:0:0', 'concept:1:0', 'meet:2:0', 'meet:2:1', 'question:2:2']);
    expect(s.shownAt).toBe(400); // the timer for question 1 starts when it appears
  });
  it('concept cards only go straight to the questions when there are no Meet cards', () => {
    let s = startSession(plan({ conceptCards: ['c-landmarks'] }), 0);
    s = reduce(s, { type: 'next-card', at: 50 });
    expect(s.phase).toBe('question');
    expect(s.shownAt).toBe(50);
  });
  it('answer and continue are ignored while a card is showing', () => {
    const s = startSession(plan({ conceptCards: ['c-landmarks'], meetCards: ['treble-C4'] }), 0);
    expect(reduce(s, { type: 'answer', answer: { kind: 'letter', letter: 'C' }, at: 10 })).toEqual(
      s,
    );
    expect(reduce(s, { type: 'continue', at: 10 })).toEqual(s);
    const meet = reduce(s, { type: 'next-card', at: 10 });
    expect(
      reduce(meet, { type: 'answer', answer: { kind: 'letter', letter: 'C' }, at: 20 }),
    ).toEqual(meet);
    expect(reduce(meet, { type: 'continue', at: 20 })).toEqual(meet);
  });
});

describe('answering', () => {
  it('ignores answers outside the question phase (double taps are harmless)', () => {
    const s0 = startSession(plan(), 0);
    const afterAnswer = right(s0, 1000);
    expect(afterAnswer.phase).toBe('feedback');
    const again = reduce(afterAnswer, {
      type: 'answer',
      answer: wrongAnswerOf((s0.queue[0] as { q: Question }).q),
      at: 1100,
    });
    expect(again).toEqual(afterAnswer); // the second tap changed nothing
    expect(again.firstAttempts).toHaveLength(1);
    const done = playAll(startSession(plan({ questions: [q('treble-C4')] }), 0));
    expect(
      reduce(done, { type: 'answer', answer: { kind: 'letter', letter: 'C' }, at: 9999 }),
    ).toEqual(done);
  });
  it('measures answer time from when the question appeared', () => {
    let s = startSession(plan(), 1000);
    s = right(s, 3500);
    expect(s.firstAttempts[0]?.ms).toBe(2500);
    s = next(s, 4000);
    expect(s.shownAt).toBe(4000);
    s = right(s, 4750);
    expect(s.firstAttempts[1]?.ms).toBe(750);
  });
  it('never records a negative time', () => {
    const s = right(startSession(plan(), 1000), 900);
    expect(s.firstAttempts[0]?.ms).toBe(0);
  });
  it('records the card (null for non-note questions) and correctness of a first attempt', () => {
    const lesson = findLesson('u1-l1') as LessonDef;
    const sess = startSession(buildLesson(lesson, emptyProgress('2026-09-01'), '2026-10-12', 1), 0);
    const after = right(reduce(sess, { type: 'next-card', at: 0 }), 10);
    expect(after.firstAttempts[0]).toEqual({ originalIndex: 0, card: null, correct: true, ms: 10 });
    const s2 = wrong(startSession(plan(), 0), 10);
    expect(s2.firstAttempts[0]).toEqual({
      originalIndex: 0,
      card: 'treble-C4',
      correct: false,
      ms: 10,
    });
    expect(s2.lastAnswer?.correct).toBe(false);
  });
  it('keeps the answer for the feedback bar and clears it on continue', () => {
    let s = wrong(startSession(plan(), 0), 10);
    expect(s.lastAnswer?.answer).toEqual(wrongAnswerOf((s.queue[0] as { q: Question }).q));
    s = next(s, 20);
    expect(s.lastAnswer).toBeNull();
  });
});

describe('combo', () => {
  it('counts consecutive correct answers, resets on a miss, and keeps the best', () => {
    let s = startSession(
      plan({ retries: false, questions: Array.from({ length: 8 }, () => q('treble-C4')) }),
      0,
    );
    const outcomes = [true, true, true, false, true, true, true, true];
    const combos: number[] = [];
    outcomes.forEach((ok, i) => {
      s = ok ? right(s, i * 10) : wrong(s, i * 10);
      combos.push(s.combo);
      s = next(s, i * 10 + 5);
    });
    expect(combos).toEqual([1, 2, 3, 0, 1, 2, 3, 4]);
    expect(s.bestCombo).toBe(4);
  });
  it('a correct answer to a retry still counts towards the combo', () => {
    let s = startSession(plan({ questions: [q('treble-C4'), q('treble-G4'), q('treble-C5')] }), 0);
    s = wrong(s, 1);
    expect(s.combo).toBe(0);
    s = next(s, 2);
    s = right(s, 3);
    s = next(s, 4);
    s = right(s, 5);
    s = next(s, 6);
    expect(currentQuestion(s)?.isRetry).toBe(true);
    s = right(s, 7);
    expect(s.combo).toBe(3);
  });
});

describe('retries', () => {
  it('a wrong first answer queues a retry 3 places later (min(index + 3, length))', () => {
    let s = startSession(plan(), 0); // 5 questions: C4 G4 C5 D4 F4
    s = wrong(s, 1);
    expect(s.queue.map((x) => x.originalIndex)).toEqual([0, 1, 2, 0, 3, 4]);
    expect(s.queue[3]?.isRetry).toBe(true);
    expect(s.queue[0]?.isRetry).toBe(false);
    expect(s.queue[3]?.q).toEqual(s.queue[0]?.q);
  });
  it('near the end the retry goes to the very end', () => {
    let s = startSession(plan(), 0);
    // answer 0..2 correctly, then miss question 3 (index 3 of 5): index+3 = 6 > length 5 -> end
    for (let i = 0; i < 3; i++) s = next(right(s, i), i);
    s = wrong(s, 10);
    expect(s.queue.map((x) => x.originalIndex)).toEqual([0, 1, 2, 3, 4, 3]);
    expect(s.queue[5]?.isRetry).toBe(true);
    // and missing the very last question appends one retry after it
    let t = startSession(plan({ questions: [q('treble-C4'), q('treble-G4')] }), 0);
    t = next(right(t, 1), 2);
    t = wrong(t, 3);
    expect(t.queue.map((x) => x.originalIndex)).toEqual([0, 1, 1]);
  });
  it('a retry is only queued once: missing a retry does not queue another', () => {
    let s = startSession(plan({ questions: [q('treble-C4'), q('treble-G4')] }), 0);
    s = next(wrong(s, 1), 2); // miss question 0 -> queue [0, 1, 0']
    s = next(right(s, 3), 4); // question 1
    expect(currentQuestion(s)?.isRetry).toBe(true);
    s = wrong(s, 5); // miss the retry
    expect(s.queue).toHaveLength(3);
    expect(s.firstAttempts).toHaveLength(2); // retries are not recorded
    s = next(s, 6);
    expect(s.phase).toBe('complete');
  });
  it('a retry answer never changes the recorded first attempt', () => {
    let s = startSession(plan({ questions: [q('treble-C4'), q('treble-G4')] }), 0);
    s = next(wrong(s, 1), 2);
    s = next(right(s, 3), 4);
    s = next(right(s, 5), 6); // correct retry
    expect(s.firstAttempts.find((f) => f.originalIndex === 0)?.correct).toBe(false);
    expect(s.firstAttempts).toHaveLength(2);
  });
  it('checkpoints (retries off) never add retries', () => {
    let s = startSession(plan({ retries: false }), 0);
    s = wrong(s, 1);
    expect(s.queue).toHaveLength(5);
    expect(s.queue.every((x) => !x.isRetry)).toBe(true);
  });
  it('the queue is a new array: the plan is never touched', () => {
    const p = deepFreeze(plan());
    const s0 = startSession(p, 0);
    const s1 = wrong(s0, 1);
    expect(s0.queue).toHaveLength(5);
    expect(s1.queue).toHaveLength(6);
    expect(p.questions).toHaveLength(5);
  });
});

describe('continue and completion', () => {
  it('moves to the next question, sets the timer, and completes after the last one', () => {
    let s = startSession(plan({ questions: [q('treble-C4'), q('treble-G4')] }), 0);
    s = right(s, 100);
    s = next(s, 200);
    expect(s).toMatchObject({ phase: 'question', index: 1, shownAt: 200 });
    s = right(s, 400);
    s = next(s, 500);
    expect(s).toMatchObject({ phase: 'complete', endedAt: 500 });
  });
  it('continue is ignored outside feedback', () => {
    const s = startSession(plan(), 0);
    expect(reduce(s, { type: 'continue', at: 5 })).toEqual(s);
    const done = playAll(startSession(plan({ questions: [q('treble-C4')] }), 0));
    expect(reduce(done, { type: 'continue', at: 99999 })).toEqual(done);
    expect(reduce(done, { type: 'next-card', at: 99999 })).toEqual(done);
  });
});

describe('resultOf', () => {
  it('throws before the session is complete', () => {
    expect(() => resultOf(startSession(plan(), 0))).toThrow();
    expect(() => resultOf(right(startSession(plan(), 0), 5))).toThrow();
  });
  it('summarises a perfect session', () => {
    const done = playAll(startSession(plan(), 1000), () => true, 700);
    const r = resultOf(done);
    expect(r).toMatchObject({
      total: 5,
      correctFirstTry: 5,
      accuracy: 100,
      perfect: true,
      bestCombo: 5,
      durationMs: 5 * 700 * 2 - 1000, // 10 actions at 700 ms, measured from the 1000 start
    });
    expect('passed' in r).toBe(false);
  });
  it('rounds accuracy to a whole number and is not perfect after a miss', () => {
    const done = playAll(
      startSession(plan({ questions: [q('treble-C4'), q('treble-G4'), q('treble-C5')] }), 0),
      (i) => i !== 1,
    );
    const r = resultOf(done);
    expect(r.correctFirstTry).toBe(2);
    expect(r.accuracy).toBe(67);
    expect(r.perfect).toBe(false);
    expect(r.total).toBe(3);
  });
  it('a missed question that is then answered right on retry still counts as missed', () => {
    const done = playAll(startSession(plan(), 0), (i) => i !== 0);
    expect(resultOf(done).correctFirstTry).toBe(4);
    expect(resultOf(done).perfect).toBe(false);
  });
  it('checkpoint passes at 13 of 15 and fails at 12', () => {
    const cp = CHECKPOINTS[0] as (typeof CHECKPOINTS)[number];
    const base = buildCheckpoint(cp, 1);
    expect(CHECKPOINT_PASS_MARK).toBe(13);
    for (const [correct, passed] of [
      [15, true],
      [14, true],
      [13, true],
      [12, false],
      [0, false],
    ] as const) {
      const done = playAll(startSession(base, 0), (i) => i < correct);
      const r = resultOf(done);
      expect(r.correctFirstTry).toBe(correct);
      expect(r.passed).toBe(passed);
      expect(r.context).toEqual({ kind: 'checkpoint', id: 'cp-a' });
    }
  });
  it('carries the context through for lessons and reviews', () => {
    const lesson = playAll(startSession(plan(), 0));
    expect(resultOf(lesson).context).toEqual({ kind: 'lesson', lessonId: 'u2-l1' });
    const review = playAll(startSession(plan({ context: { kind: 'review' } }), 0));
    expect(resultOf(review).context).toEqual({ kind: 'review' });
    expect('passed' in resultOf(review)).toBe(false);
  });
});

/** Plays a session to the end; `ok(i)` says whether the i-th answered question is answered right. */
function playAll(
  start: SessionState,
  ok: (answeredIndex: number) => boolean = () => true,
  step = 100,
): SessionState {
  let s = start;
  let t = 0;
  let n = 0;
  for (let guard = 0; s.phase !== 'complete' && guard < 1000; guard++) {
    t += step;
    if (s.phase === 'concept' || s.phase === 'meet') s = reduce(s, { type: 'next-card', at: t });
    else if (s.phase === 'question') {
      const cur = currentQuestion(s);
      if (!cur) throw new Error('missing question');
      // only first attempts consult `ok`; retries are always answered right
      const good = cur.isRetry ? true : ok(cur.originalIndex);
      s = reduce(s, {
        type: 'answer',
        answer: good ? correctAnswerOf(cur.q) : wrongAnswerOf(cur.q),
        at: t,
      });
      n++;
    } else s = reduce(s, { type: 'continue', at: t });
  }
  expect(n).toBeGreaterThan(0);
  return s;
}

describe('property: random sessions over real plans', () => {
  const lessons = ['u1-l3', 'u2-l1', 'u4-l2', 'u8-l1', 'u9-lv3-a', 'u11-l2'];
  const plans: LessonPlan[] = [
    ...lessons.map((id, i) =>
      buildLesson(findLesson(id) as LessonDef, emptyProgress('2026-09-01'), '2026-10-12', i + 1),
    ),
    buildCheckpoint(CHECKPOINTS[1] as (typeof CHECKPOINTS)[number], 5),
    buildReview(
      (() => {
        const p = emptyProgress('2026-09-01');
        for (const c of ['treble-C4', 'treble-G4', 'treble-C5'] as const)
          p.cards[c] = {
            box: 1,
            lastSeenDay: '2026-10-01',
            lastPromotedDay: null,
            seen: 1,
            correct: 1,
            avgMs: 1,
          };
        return p;
      })(),
      '2026-10-12',
      9,
    ),
  ];
  const anyAction = (s: SessionState): fc.Arbitrary<Action> =>
    fc.oneof(
      fc.constant<Action>({ type: 'next-card', at: 0 }),
      fc.constant<Action>({ type: 'continue', at: 0 }),
      fc.constant<Action>({ type: 'answer', answer: { kind: 'letter', letter: 'C' }, at: 0 }),
      fc.constant<Action>({ type: 'answer', answer: { kind: 'key', note: 'black' }, at: 0 }),
      fc.boolean().map<Action>((good) => {
        const cur = currentQuestion(s);
        return {
          type: 'answer',
          answer: cur
            ? good
              ? correctAnswerOf(cur.q)
              : wrongAnswerOf(cur.q)
            : { kind: 'letter', letter: 'A' },
          at: 0,
        };
      }),
    );

  it('always reaches complete; retries once per question; invariants hold at every step', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: plans.length - 1 }),
        fc.array(fc.tuple(fc.nat(4), fc.nat(50), fc.integer({ min: 0, max: 20_000 })), {
          minLength: 300,
          maxLength: 300,
        }),
        (planIdx, noise) => {
          const lessonPlan = plans[planIdx] as LessonPlan;
          let s = startSession(deepFreeze(structuredClone(lessonPlan)), 1000);
          let clock = 1000;
          let steps = 0;
          let k = 0;
          while (s.phase !== 'complete') {
            const [kind, , dt] = noise[k++ % noise.length] as [number, number, number];
            clock += dt;
            const cur = currentQuestion(s);
            let action: Action;
            if (s.phase === 'concept' || s.phase === 'meet')
              action = { type: 'next-card', at: clock };
            else if (s.phase === 'feedback') action = { type: 'continue', at: clock };
            else if (cur === null) throw new Error('question phase without a question');
            else
              action = {
                type: 'answer',
                answer: kind % 3 === 0 ? wrongAnswerOf(cur.q) : correctAnswerOf(cur.q),
                at: clock,
              };
            const before = s;
            s = reduce(s, action);
            // never mutates earlier states
            expect(before.queue.length).toBeLessThanOrEqual(s.queue.length);
            // stray/duplicate actions never change anything or break invariants
            if (kind === 4 && s.phase !== 'complete') {
              const stray: Action =
                s.phase === 'question'
                  ? { type: 'continue', at: clock }
                  : { type: 'answer', answer: { kind: 'letter', letter: 'C' }, at: clock };
              expect(reduce(s, stray)).toEqual(s);
            }
            if (++steps > 2000) throw new Error('session did not finish');
          }
          const r = resultOf(s);
          const n = lessonPlan.questions.length;
          expect(r.total).toBe(n);
          expect(s.firstAttempts).toHaveLength(n);
          expect(new Set(s.firstAttempts.map((f) => f.originalIndex)).size).toBe(n);
          expect(r.accuracy).toBeGreaterThanOrEqual(0);
          expect(r.accuracy).toBeLessThanOrEqual(100);
          expect(Number.isInteger(r.accuracy)).toBe(true);
          expect(r.correctFirstTry).toBeLessThanOrEqual(r.total);
          expect(r.bestCombo).toBeLessThanOrEqual(
            r.total + s.queue.filter((x) => x.isRetry).length,
          );
          expect(r.durationMs).toBe((s.endedAt ?? 0) - 1000);
          // retries: at most one per original question, none for checkpoints
          const retries = s.queue.filter((x) => x.isRetry);
          expect(new Set(retries.map((x) => x.originalIndex)).size).toBe(retries.length);
          expect(retries.length).toBeLessThanOrEqual(n);
          if (!lessonPlan.retries) expect(retries).toHaveLength(0);
          expect(s.queue).toHaveLength(n + retries.length);
          // every retry belongs to a question that was missed first time
          for (const x of retries) {
            expect(s.firstAttempts.find((f) => f.originalIndex === x.originalIndex)?.correct).toBe(
              false,
            );
          }
          // every missed question has exactly one retry (when retries are on)
          if (lessonPlan.retries) {
            const missed = s.firstAttempts.filter((f) => !f.correct).length;
            expect(retries).toHaveLength(missed);
          }
          // a retry always appears after its original
          for (const x of retries) {
            const orig = s.queue.findIndex(
              (y) => y.originalIndex === x.originalIndex && !y.isRetry,
            );
            expect(s.queue.indexOf(x)).toBeGreaterThan(orig);
          }
          if (lessonPlan.context.kind === 'checkpoint')
            expect(r.passed).toBe(r.correctFirstTry >= 13);
          return true;
        },
      ),
      { numRuns: 120 },
    );
  });

  it('random action soup (including nonsense) never throws and never leaves a valid phase', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: plans.length - 1 }), fc.integer(), (planIdx, seed) => {
        let s = startSession(plans[planIdx] as LessonPlan, 0);
        let r = seed >>> 0;
        const rnd = (): number => {
          r = (Math.imul(r ^ (r >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0;
          return r / 4294967296;
        };
        for (let i = 0; i < 400; i++) {
          const arb = anyAction(s);
          const [a] = fc.sample(arb, { numRuns: 1, seed: Math.floor(rnd() * 1e9) }) as [Action];
          s = reduce(s, { ...a, at: i * 10 });
          expect(['concept', 'meet', 'question', 'feedback', 'complete']).toContain(s.phase);
          expect(s.index).toBeGreaterThanOrEqual(0);
          expect(s.index).toBeLessThanOrEqual(s.queue.length);
          expect(s.combo).toBeLessThanOrEqual(s.bestCombo);
        }
        return true;
      }),
      { numRuns: 40 },
    );
  });
});
