import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ALL_CARDS, parseCardId, type CardId } from './cards';
import {
  CHECKPOINTS,
  UNITS,
  allLessonIds,
  findLesson,
  levelLessons,
  pathLessons,
  type LessonDef,
} from './curriculum';
import { diatonicIndex, staffPosition } from './notes';
import {
  buildCheckpoint,
  buildLesson,
  buildReview,
  orderWithoutRepeats,
  type LessonPlan,
} from './lessonBuilder';
import { emptyProgress, type Progress } from './progress';
import { checkAnswer, correctAnswerOf, cardOf, type Question } from './questions';
import { mulberry32 } from './rng';
import type { Box, CardState } from './srs';
import { deepFreeze, progressArb } from './testkit';

const TODAY = '2026-10-12';
const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13);

const state = (box: Box, lastSeenDay: string): CardState => ({
  box,
  lastSeenDay,
  lastPromotedDay: null,
  seen: 5,
  correct: 4,
  avgMs: 2000,
});
const progressWith = (
  cards: Partial<Record<CardId, CardState>>,
  lessons: string[] = [],
): Progress => {
  const p = emptyProgress('2026-09-01');
  for (const [k, v] of Object.entries(cards)) p.cards[k as CardId] = v;
  for (const id of lessons)
    p.lessons[id] = {
      timesCompleted: 1,
      bestAccuracy: 100,
      firstCompletedDay: TODAY,
      lastCompletedDay: TODAY,
    };
  return p;
};

/** A handful of random-but-valid progress documents to run every lesson against. */
const RANDOM_PROGRESS: Progress[] = [
  emptyProgress('2026-09-01'),
  ...fc.sample(progressArb, { numRuns: 7, seed: 42 }),
];

const noteCards = (plan: LessonPlan): (CardId | null)[] => plan.questions.map(cardOf);
const allLessons = (): LessonDef[] => [
  ...pathLessons(),
  ...UNITS.flatMap((u) => [...levelLessons(u.n, 2), ...levelLessons(u.n, 3)]),
];

describe('buildLesson: properties over EVERY lesson × 200 seeds × random progress', () => {
  for (const def of allLessons()) {
    it(def.id, () => {
      const q = def.questionCount;
      const capSpec = def.pool.length > 0 ? Math.ceil(q / def.pool.length) + 2 : q;
      SEEDS.forEach((seed, s) => {
        const p = RANDOM_PROGRESS[s % RANDOM_PROGRESS.length] as Progress;
        const plan = buildLesson(def, p, TODAY, seed);
        const label = `${def.id} seed ${String(seed)}`;

        // exact count, answerable, kinds from the mix
        expect(plan.questions, label).toHaveLength(q);
        for (const question of plan.questions) {
          expect(checkAnswer(question, correctAnswerOf(question)), label).toBe(true);
          expect(Object.keys(def.mix), label).toContain(question.kind);
        }
        expect(plan.retries).toBe(true);
        expect(plan.context).toEqual({ kind: 'lesson', lessonId: def.id });
        expect(plan.conceptCards).toEqual(def.conceptCards);
        expect(plan.meetCards).toEqual(def.newCards.filter((c) => !Object.hasOwn(p.cards, c)));

        if (def.unit !== 1 && def.unit !== 11) {
          const cards = noteCards(plan) as CardId[];
          // every card in the pool, never null for note lessons
          for (const c of cards) expect(def.pool, label).toContain(c);
          // spec cap and new cards at least 3 times
          const count = (c: CardId): number => cards.filter((x) => x === c).length;
          for (const c of def.pool)
            expect(count(c), `${label} cap ${c}`).toBeLessThanOrEqual(capSpec);
          for (const c of def.newCards)
            expect(count(c), `${label} new ${c}`).toBeGreaterThanOrEqual(3);
          // no consecutive duplicates (pools always have >= 2 cards)
          for (let i = 1; i < cards.length; i++)
            expect(cards[i], `${label} @${String(i)}`).not.toBe(cards[i - 1]);
          // first slot of each new card is name-note at level 1
          if (def.level === 1) {
            for (const c of def.newCards) {
              const first = plan.questions.find((x) => cardOf(x) === c);
              expect(first?.kind, `${label} first ${c}`).toBe('name-note');
            }
          }
          // render rules
          for (const question of plan.questions) {
            if (question.kind === 'find-on-staff') expect('render' in question).toBe(false);
            else if ('render' in question) expect(question.render).toBe(def.render);
          }
        }
      });
    });
  }
});

describe('buildLesson: rules', () => {
  const u3l1 = findLesson('u3-l1') as LessonDef;
  it('meetCards skips cards already learned (replays)', () => {
    const fresh = buildLesson(
      findLesson('u2-l1') as LessonDef,
      emptyProgress('2026-09-01'),
      TODAY,
      1,
    );
    expect(fresh.meetCards).toEqual(['treble-C4', 'treble-G4']);
    const learned = progressWith({ 'treble-C4': state(3, TODAY) });
    expect(buildLesson(findLesson('u2-l1') as LessonDef, learned, TODAY, 1).meetCards).toEqual([
      'treble-G4',
    ]);
    const both = progressWith({ 'treble-C4': state(3, TODAY), 'treble-G4': state(3, TODAY) });
    expect(buildLesson(findLesson('u2-l1') as LessonDef, both, TODAY, 1).meetCards).toEqual([]);
  });
  it('a replay still asks each new card 3+ times', () => {
    const both = progressWith({ 'treble-C4': state(5, TODAY), 'treble-G4': state(5, TODAY) });
    const plan = buildLesson(findLesson('u2-l1') as LessonDef, both, TODAY, 5);
    const cards = noteCards(plan);
    expect(cards.filter((c) => c === 'treble-C4').length).toBeGreaterThanOrEqual(3);
    expect(cards.filter((c) => c === 'treble-G4').length).toBeGreaterThanOrEqual(3);
  });
  it('is deterministic for a seed and varies with the seed', () => {
    const p = emptyProgress('2026-09-01');
    const a = buildLesson(u3l1, p, TODAY, 99);
    const b = buildLesson(u3l1, p, TODAY, 99);
    expect(b).toEqual(a);
    const different = new Set(
      SEEDS.slice(0, 30).map((s) => JSON.stringify(buildLesson(u3l1, p, TODAY, s).questions)),
    );
    expect(different.size).toBeGreaterThan(10);
  });
  it('does not mutate a frozen progress or the lesson definition', () => {
    const p = deepFreeze(progressWith({ 'treble-C4': state(2, '2026-10-01') }));
    const def = deepFreeze(structuredClone(u3l1));
    expect(() => buildLesson(def, p, TODAY, 3)).not.toThrow();
  });
  it('weights cards the learner knows well (box > 2, not due) lower than others', () => {
    const p = progressWith({ 'treble-C4': state(5, TODAY) }); // box 5, seen today: not due
    const def = findLesson('u3-l4') as LessonDef; // 8-card review lesson, no new cards
    let known = 0;
    let other = 0;
    for (const seed of SEEDS) {
      const cards = noteCards(buildLesson(def, p, TODAY, seed));
      known += cards.filter((c) => c === 'treble-C4').length;
      other += cards.filter((c) => c === 'treble-D4').length;
    }
    expect(known).toBeLessThan(other * 0.6);
  });
  it('weights due and weak cards like new ones', () => {
    const def = findLesson('u3-l4') as LessonDef;
    const weakNotDue = progressWith({ 'treble-C4': state(2, TODAY) });
    const strongDue = progressWith({ 'treble-C4': state(5, '2026-01-01') });
    for (const p of [weakNotDue, strongDue]) {
      let c4 = 0;
      let d4 = 0;
      for (const seed of SEEDS) {
        const cards = noteCards(buildLesson(def, p, TODAY, seed));
        c4 += cards.filter((c) => c === 'treble-C4').length;
        d4 += cards.filter((c) => c === 'treble-D4').length;
      }
      expect(c4).toBeGreaterThan(d4 * 0.75);
      expect(c4).toBeLessThan(d4 * 1.25);
    }
  });
  it('level 2 mixes name-note and find-key-letter; level 3 uses all three kinds', () => {
    const kinds = (id: string): Set<string> => {
      const out = new Set<string>();
      for (const seed of SEEDS.slice(0, 50)) {
        for (const q of buildLesson(
          findLesson(id) as LessonDef,
          emptyProgress('2026-09-01'),
          TODAY,
          seed,
        ).questions)
          out.add(q.kind);
      }
      return out;
    };
    expect([...kinds('u4-lv2-a')].sort()).toEqual(['find-key-letter', 'name-note']);
    expect([...kinds('u4-lv3-a')].sort()).toEqual(['find-key-exact', 'find-on-staff', 'name-note']);
  });
  it('grand-staff units render grand', () => {
    const plan = buildLesson(
      findLesson('u8-lv2-a') as LessonDef,
      emptyProgress('2026-09-01'),
      TODAY,
      8,
    );
    for (const q of plan.questions)
      if (q.kind === 'find-key-letter') expect(q.render).toBe('grand');
  });
});

describe('unit 1', () => {
  for (const def of UNITS[0]?.lessons ?? []) {
    it(`${def.id}: 8 questions, no identical neighbours, only mix kinds`, () => {
      for (const seed of SEEDS) {
        const plan = buildLesson(def, emptyProgress('2026-09-01'), TODAY, seed);
        expect(plan.questions).toHaveLength(8);
        plan.questions.forEach((q, i) => {
          expect(Object.keys(def.mix)).toContain(q.kind);
          if (i > 0) expect(JSON.stringify(q)).not.toBe(JSON.stringify(plan.questions[i - 1]));
          if (q.kind === 'higher-lower') {
            const a = diatonicIndex(q.first);
            const b = diatonicIndex(q.second);
            expect(a).toBeGreaterThanOrEqual(30);
            expect(a).toBeLessThanOrEqual(38);
            expect(b).toBeGreaterThanOrEqual(30);
            expect(b).toBeLessThanOrEqual(38);
            expect(Math.abs(a - b)).toBeGreaterThanOrEqual(2);
          }
          if (q.kind === 'line-or-space') {
            expect(q.position).toBeGreaterThanOrEqual(0);
            expect(q.position).toBeLessThanOrEqual(8);
          }
        });
        expect(plan.meetCards).toEqual([]);
      }
    });
  }
  it('u1-l1 asks both directions over many seeds', () => {
    const dirs = new Set<string>();
    for (const seed of SEEDS)
      for (const q of buildLesson(
        UNITS[0]?.lessons[0] as LessonDef,
        emptyProgress('2026-09-01'),
        TODAY,
        seed,
      ).questions)
        if (q.kind === 'alphabet-next') dirs.add(q.direction);
    expect(dirs.size).toBe(2);
  });
});

describe('unit 11', () => {
  for (const def of UNITS[10]?.lessons ?? []) {
    it(`${def.id}: legal step/skip questions for its config`, () => {
      const cfg = def.stepSkipConfig;
      expect(cfg).toBeDefined();
      for (const seed of SEEDS) {
        const plan = buildLesson(def, emptyProgress('2026-09-01'), TODAY, seed);
        expect(plan.questions).toHaveLength(10);
        for (const q of plan.questions) {
          if (q.kind !== 'step-skip' || !cfg) throw new Error('expected step-skip');
          expect(cfg.clefs).toContain(q.clef);
          expect(q.buttons).toBe(cfg.buttons);
          const p1 = staffPosition(q.clef, q.first);
          const p2 = staffPosition(q.clef, q.second);
          expect(p1).toBeGreaterThanOrEqual(0);
          expect(p1).toBeLessThanOrEqual(8);
          expect(p2).toBeGreaterThanOrEqual(-1);
          expect(p2).toBeLessThanOrEqual(9);
          const d = Math.abs(diatonicIndex(q.second) - diatonicIndex(q.first));
          expect(cfg.intervals).toContain(d === 1 ? 'step' : 'skip');
          expect([1, 2]).toContain(d);
        }
        plan.questions.forEach((q, i) => {
          if (i > 0) expect(JSON.stringify(q)).not.toBe(JSON.stringify(plan.questions[i - 1]));
        });
      }
    });
  }
  it('u11-l1 never asks skips and uses 2 buttons; u11-l2 asks both over many seeds', () => {
    const kinds = (id: string): Set<string> => {
      const out = new Set<string>();
      for (const seed of SEEDS) {
        for (const q of buildLesson(
          findLesson(id) as LessonDef,
          emptyProgress('2026-09-01'),
          TODAY,
          seed,
        ).questions)
          if (q.kind === 'step-skip') out.add(JSON.stringify(correctAnswerOf(q)));
      }
      return out;
    };
    expect([...kinds('u11-l1')].every((a) => a.includes('step'))).toBe(true);
    expect(kinds('u11-l2').size).toBe(4);
  });
});

describe('buildReview', () => {
  it('throws with fewer than 3 cards', () => {
    expect(() =>
      buildReview(
        progressWith({ 'treble-C4': state(1, TODAY), 'treble-G4': state(1, TODAY) }),
        TODAY,
        1,
      ),
    ).toThrow();
  });
  it('property: 10 questions, only learned cards, no neighbours equal, answerable, retries on', () => {
    for (const seed of SEEDS) {
      for (const p of RANDOM_PROGRESS) {
        if (Object.keys(p.cards).length < 3) continue;
        const plan = buildReview(p, TODAY, seed);
        expect(plan.context).toEqual({ kind: 'review' });
        expect(plan.retries).toBe(true);
        expect(plan.conceptCards).toEqual([]);
        expect(plan.meetCards).toEqual([]);
        expect(plan.questions).toHaveLength(10);
        const cards = noteCards(plan) as CardId[];
        for (const c of cards) expect(Object.hasOwn(p.cards, c)).toBe(true);
        for (let i = 1; i < cards.length; i++) expect(cards[i]).not.toBe(cards[i - 1]);
        for (const q of plan.questions) {
          expect(checkAnswer(q, correctAnswerOf(q))).toBe(true);
          if (q.kind !== 'name-note' && q.kind !== 'find-key-letter') throw new Error(q.kind);
          expect(q.render).toBe('single');
        }
      }
    }
  });
  it('minimum case: exactly 3 cards still gives 10 questions without neighbours repeating', () => {
    const p = progressWith({
      'treble-C4': state(1, TODAY),
      'treble-G4': state(1, TODAY),
      'treble-C5': state(1, TODAY),
    });
    for (const seed of SEEDS) {
      const cards = noteCards(buildReview(p, TODAY, seed)) as CardId[];
      expect(cards).toHaveLength(10);
      for (let i = 1; i < cards.length; i++) expect(cards[i]).not.toBe(cards[i - 1]);
    }
  });
  it('takes the 10 weakest due cards, lowest box then oldest first', () => {
    const cards: Partial<Record<CardId, CardState>> = {};
    ALL_CARDS.slice(0, 12).forEach((id, i) => {
      cards[id] = state((1 + (i % 5)) as Box, `2026-09-${String(10 + i).padStart(2, '0')}`);
    });
    const p = progressWith(cards);
    const expected = Object.entries(cards)
      .sort(
        ([ia, a], [ib, b]) =>
          a.box - b.box || (a.lastSeenDay < b.lastSeenDay ? -1 : 1) || (ia < ib ? -1 : 1),
      )
      .slice(0, 10)
      .map(([id]) => id)
      .sort();
    const got = new Set(noteCards(buildReview(p, TODAY, 4)) as string[]);
    expect([...got].sort()).toEqual(expected);
  });
  it('with fewer than 5 due, due cards appear twice and non-due fill the rest', () => {
    const p = progressWith({
      'treble-C4': state(1, TODAY), // due (box 1, interval 0)
      'treble-G4': state(5, TODAY), // not due
      'treble-C5': state(4, TODAY), // not due
      'treble-D4': state(3, TODAY), // not due
    });
    const cards = noteCards(buildReview(p, TODAY, 11)) as CardId[];
    const count = (c: CardId): number => cards.filter((x) => x === c).length;
    expect(count('treble-C4')).toBeGreaterThanOrEqual(2);
    for (const c of ['treble-G4', 'treble-C5', 'treble-D4'] as CardId[])
      expect(count(c)).toBeGreaterThanOrEqual(1);
    expect(cards).toHaveLength(10);
  });
  it('non-due cards fill lowest box first', () => {
    const cards: Partial<Record<CardId, CardState>> = {
      'treble-A3': state(1, TODAY), // the only due card
    };
    // 9 non-due cards with boxes 2..5 repeating, seen today
    ALL_CARDS.slice(1, 10).forEach((id, i) => {
      cards[id] = state((2 + (i % 4)) as Box, TODAY);
    });
    const got = new Set(noteCards(buildReview(progressWith(cards), TODAY, 2)) as string[]);
    // slots: A3 twice, then 8 lowest-box non-due cards -> the highest-box (5) one is excluded
    const nonDue = Object.entries(cards)
      .filter(([id]) => id !== 'treble-A3')
      .sort(([ia, a], [ib, b]) => a.box - b.box || (ia < ib ? -1 : 1));
    const excluded = nonDue[nonDue.length - 1]?.[0] as string;
    expect(got.has(excluded)).toBe(false);
    expect(got.has('treble-A3')).toBe(true);
  });
  it('keyboard locked: only name-note; unlocked: name-note and find-key-letter (about 70/30)', () => {
    const base: Partial<Record<CardId, CardState>> = {};
    ALL_CARDS.slice(0, 11).forEach((id) => (base[id] = state(1, TODAY)));
    const locked = progressWith(base);
    const unlocked = progressWith(base, ['u4-l5']);
    const kinds = (p: Progress): string[] =>
      SEEDS.flatMap((s) => buildReview(p, TODAY, s).questions.map((q) => q.kind));
    expect(new Set(kinds(locked))).toEqual(new Set(['name-note']));
    const ks = kinds(unlocked);
    expect(new Set(ks)).toEqual(new Set(['name-note', 'find-key-letter']));
    const share = ks.filter((k) => k === 'find-key-letter').length / ks.length;
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.4);
  });
  it('does not mutate a frozen progress', () => {
    const p = deepFreeze(
      progressWith({
        'treble-C4': state(1, TODAY),
        'treble-G4': state(2, TODAY),
        'treble-C5': state(3, TODAY),
      }),
    );
    expect(() => buildReview(p, TODAY, 3)).not.toThrow();
  });
});

describe('buildCheckpoint', () => {
  for (const cp of CHECKPOINTS) {
    it(`${cp.id}: 15 name-note questions over its pool, no retries, no neighbours equal`, () => {
      for (const seed of SEEDS) {
        const plan = buildCheckpoint(cp, seed);
        expect(plan.context).toEqual({ kind: 'checkpoint', id: cp.id });
        expect(plan.retries).toBe(false);
        expect(plan.conceptCards).toEqual([]);
        expect(plan.meetCards).toEqual([]);
        expect(plan.questions).toHaveLength(15);
        const cards = noteCards(plan) as CardId[];
        for (const q of plan.questions) {
          expect(q.kind).toBe('name-note');
          expect(checkAnswer(q, correctAnswerOf(q))).toBe(true);
        }
        for (const c of cards) expect(cp.pool).toContain(c);
        for (let i = 1; i < cards.length; i++) expect(cards[i]).not.toBe(cards[i - 1]);
        if (cp.pool.length <= 15) {
          for (const c of cp.pool) expect(cards, `${cp.id} ${c}`).toContain(c); // each card at least once
        } else {
          expect(new Set(cards).size).toBe(15); // distinct when the pool is big enough
        }
      }
    });
  }
  it('cp-c mixes both clefs across seeds', () => {
    const clefs = new Set<string>();
    for (const seed of SEEDS.slice(0, 20)) {
      for (const c of noteCards(
        buildCheckpoint(CHECKPOINTS[2] as (typeof CHECKPOINTS)[number], seed),
      ) as CardId[]) {
        clefs.add(parseCardId(c)?.clef ?? '');
      }
    }
    expect(clefs).toEqual(new Set(['treble', 'bass']));
  });
});

describe('orderWithoutRepeats', () => {
  const A = 'treble-C4';
  const B = 'treble-G4';
  const C = 'treble-C5';
  it('keeps the same multiset', () => {
    const input: CardId[] = [A, A, B, B, C, C, A, B];
    const out = orderWithoutRepeats(input, mulberry32(1));
    expect([...out].sort()).toEqual([...input].sort());
  });
  it('arranges any multiset whose largest count is at most half (rounded up)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(A, B, C), { minLength: 2, maxLength: 15 }),
        fc.integer(),
        (cards, seed) => {
          const max = Math.max(...[A, B, C].map((c) => cards.filter((x) => x === c).length));
          if (max > Math.ceil(cards.length / 2)) return true;
          const out = orderWithoutRepeats(cards, mulberry32(seed));
          return out.every((c, i) => i === 0 || c !== out[i - 1]);
        },
      ),
      { numRuns: 500 },
    );
  });
  it('does not loop or throw on impossible input (one dominant card)', () => {
    const out = orderWithoutRepeats([A, A, A, A, B], mulberry32(1));
    expect(out).toHaveLength(5);
  });
  it('handles empty and single-item input', () => {
    expect(orderWithoutRepeats([], mulberry32(1))).toEqual([]);
    expect(orderWithoutRepeats([A], mulberry32(1))).toEqual([A]);
  });
});

describe('coverage of ids', () => {
  it('the property block above covered every non-checkpoint lesson id', () => {
    const ids = allLessons()
      .map((l) => l.id)
      .sort();
    expect(ids).toEqual(
      allLessonIds()
        .filter((id) => !id.startsWith('cp-'))
        .sort(),
    );
  });
  it('question type guard: every built question is a known kind', () => {
    const q: Question | undefined = buildLesson(
      pathLessons()[4] as LessonDef,
      emptyProgress('2026-09-01'),
      TODAY,
      1,
    ).questions[0];
    expect(q?.kind).toBe('name-note');
  });
});
