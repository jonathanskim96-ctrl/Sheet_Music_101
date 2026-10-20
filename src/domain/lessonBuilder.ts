import { isCardId, isNaturalCard, isSignCard, type CardId } from './cards';
import { type ConceptCardId } from './content';
import type { CheckpointDef, LessonDef, LessonId, QuestionKind } from './curriculum';
import type { DayKey } from './days';
import { LETTERS, noteAtPosition, noteFromDiatonic } from './notes';
import type { Progress } from './progress';
import { pitchOptions, type Question } from './questions';
import { mulberry32, pickWeighted, shuffle } from './rng';
import { orderWithoutRepeats } from './cardOrder';
import { isDue } from './srs';
import { keyboardUnlocked } from './unlocks';

export interface LessonPlan {
  context:
    | { kind: 'lesson'; lessonId: LessonId }
    | { kind: 'review' }
    | { kind: 'checkpoint'; id: CheckpointDef['id'] };
  conceptCards: ConceptCardId[];
  meetCards: CardId[];
  questions: Question[];
  retries: boolean; // false for checkpoints
}

const REVIEW_COUNT = 10;
const CHECKPOINT_COUNT = 15;
const NEW_CARD_REPEATS = 3;

/** All kinds in a fixed order so weighted sampling is deterministic for a seed. */
const KIND_ORDER: readonly QuestionKind[] = [
  'name-note',
  'find-key-letter',
  'find-key-exact',
  'find-on-staff',
  'step-skip',
  'alphabet-next',
  'keyboard-letter',
  'line-or-space',
  'higher-lower',
  'clef-identify',
  'name-accidental',
  'find-key-pitch',
];

function pickKind(mix: LessonDef['mix'], rand: () => number): QuestionKind {
  const kinds = KIND_ORDER.filter((k) => (mix[k] ?? 0) > 0);
  return pickWeighted(
    kinds,
    kinds.map((k) => mix[k] ?? 0),
    rand,
  );
}

// ---------------------------------------------------------------- note lessons

function noteQuestion(
  kind: QuestionKind,
  card: CardId,
  render: 'single' | 'grand',
  rand: () => number,
  showNaturals = false,
): Question {
  switch (kind) {
    case 'find-key-pitch':
      return { kind, card, render };
    case 'name-accidental':
      // A plain card gets a printed natural sign only in the lessons that teach it (unit 15).
      return {
        kind,
        card,
        render,
        showNatural: showNaturals && isNaturalCard(card),
        options: pitchOptions(card, rand),
      };
    case 'name-note':
    case 'find-key-letter':
    case 'find-key-exact':
      return { kind, card, render };
    case 'find-on-staff':
      return { kind, card }; // always a single staff
    default:
      throw new Error(`${kind} is not a note question`);
  }
}

function buildNoteLesson(
  def: LessonDef,
  p: Progress,
  today: DayKey,
  rand: () => number,
): Question[] {
  // No lesson uses 'rhythm' yet; the part-2 builder (M11) will own those.
  const render = def.render;
  if (render === 'rhythm') throw new Error(`${def.id}: rhythm lessons are not built yet`);
  const q = def.questionCount;
  const pool = def.pool;
  // The spec cap, tightened to half the slots so a repeat-free order always exists.
  const cap = pool.length >= 2 ? Math.min(Math.ceil(q / pool.length) + 2, Math.ceil(q / 2)) : q;

  const counts = new Map<CardId, number>();
  const slots: CardId[] = [];
  const add = (c: CardId): void => {
    slots.push(c);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  };
  for (const c of def.newCards) for (let i = 0; i < NEW_CARD_REPEATS; i++) add(c);

  const weightOf = (c: CardId): number => {
    const state = Object.hasOwn(p.cards, c) ? p.cards[c] : undefined;
    return state === undefined || isDue(state, today) || state.box <= 2 ? 4 : 1;
  };
  while (slots.length < q) {
    let eligible = pool.filter((c) => (counts.get(c) ?? 0) < cap);
    if (eligible.length === 0) eligible = [...pool];
    add(pickWeighted(eligible, eligible.map(weightOf), rand));
  }

  const ordered = orderWithoutRepeats(slots, rand);
  // Kinds are chosen after the order is fixed so "a card's first slot is name-note" refers to
  // the order the learner sees (SPEC 4.12 step 3).
  const seen = new Set<CardId>();
  return ordered.map((card) => {
    const first = !seen.has(card);
    seen.add(card);
    // Units 12–15 introduce a sign card with name-accidental (SPEC 8.9); earlier units with name-note.
    const firstKind = def.unit >= 12 ? 'name-accidental' : 'name-note';
    const kind = def.level === 1 && first ? firstKind : pickKind(def.mix, rand);
    return noteQuestion(kind, card, render, rand, def.material?.showNaturals === true);
  });
}

// ---------------------------------------------------------------- unit 1 and unit 11

const sameQuestion = (a: Question | undefined, b: Question): boolean =>
  a !== undefined && JSON.stringify(a) === JSON.stringify(b);

function unit1Options(kind: QuestionKind): Question[] {
  switch (kind) {
    case 'alphabet-next':
      return LETTERS.flatMap((letter) => [
        { kind, letter, direction: 'after' as const },
        { kind, letter, direction: 'before' as const },
      ]);
    case 'keyboard-letter':
      return LETTERS.map((letter) => ({ kind, letter }));
    case 'line-or-space':
      return Array.from({ length: 9 }, (_, position) => ({ kind, position }));
    case 'clef-identify':
      return [
        { kind, clef: 'treble' as const },
        { kind, clef: 'bass' as const },
      ];
    case 'higher-lower': {
      // E4..F5, at least two steps apart so the difference is easy to see.
      const out: Question[] = [];
      for (let a = 30; a <= 38; a++) {
        for (let b = 30; b <= 38; b++) {
          const first = noteFromDiatonic(a);
          const second = noteFromDiatonic(b);
          if (Math.abs(a - b) >= 2 && first && second) out.push({ kind, first, second });
        }
      }
      return out;
    }
    default:
      throw new Error(`Unit 1 has no ${kind} questions`);
  }
}

function buildFromOptions(
  def: LessonDef,
  rand: () => number,
  optionsFor: (kind: QuestionKind) => Question[],
): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < def.questionCount; i++) {
    const options = optionsFor(pickKind(def.mix, rand));
    const fresh = options.filter((o) => !sameQuestion(out[i - 1], o));
    const from = fresh.length > 0 ? fresh : options;
    out.push(from[Math.floor(rand() * from.length)] as Question);
  }
  return out;
}

function stepSkipOptions(def: LessonDef): Question[] {
  const cfg = def.stepSkipConfig;
  if (!cfg) throw new Error(`Lesson ${def.id} has no stepSkipConfig`);
  const out: Question[] = [];
  for (const clef of cfg.clefs) {
    for (let p = 0; p <= 8; p++) {
      for (const interval of cfg.intervals) {
        for (const sign of [1, -1]) {
          const second = p + sign * (interval === 'step' ? 1 : 2);
          const a = noteAtPosition(clef, p);
          const b = noteAtPosition(clef, second);
          if (second >= -1 && second <= 9 && a && b) {
            out.push({ kind: 'step-skip', clef, first: a, second: b, buttons: cfg.buttons });
          }
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- public builders

/** Builds the plan for a level-1/2/3 lesson. Pure: the same inputs and seed give the same plan. */
export function buildLesson(def: LessonDef, p: Progress, today: DayKey, seed: number): LessonPlan {
  const rand = mulberry32(seed);
  const meetCards = def.newCards.filter((c) => !Object.hasOwn(p.cards, c));
  let questions: Question[];
  if (def.unit === 1) questions = buildFromOptions(def, rand, unit1Options);
  else if (def.unit === 11) {
    const options = stepSkipOptions(def);
    questions = buildFromOptions(def, rand, () => options);
  } else questions = buildNoteLesson(def, p, today, rand);
  return {
    context: { kind: 'lesson', lessonId: def.id },
    conceptCards: [...def.conceptCards],
    meetCards,
    questions,
    retries: true,
  };
}

/** Builds a 10-question review of cards the learner has met, weakest and most overdue first. */
export function buildReview(p: Progress, today: DayKey, seed: number): LessonPlan {
  const rand = mulberry32(seed);
  const known = Object.entries(p.cards).flatMap(([id, state]) =>
    isCardId(id) ? [{ id, state }] : [],
  );
  if (known.length < 3) throw new Error('Review needs at least 3 cards');

  const byPriority = (a: (typeof known)[number], b: (typeof known)[number]): number =>
    a.state.box - b.state.box ||
    (a.state.lastSeenDay < b.state.lastSeenDay
      ? -1
      : a.state.lastSeenDay > b.state.lastSeenDay
        ? 1
        : 0) ||
    (a.id < b.id ? -1 : 1);
  const due = known.filter((k) => isDue(k.state, today)).sort(byPriority);
  const rest = known.filter((k) => !isDue(k.state, today)).sort(byPriority);

  let slots: CardId[];
  if (due.length >= 5) slots = due.slice(0, REVIEW_COUNT).map((k) => k.id);
  else slots = due.flatMap((k) => [k.id, k.id]); // few due: each may appear twice
  for (const k of rest) {
    if (slots.length >= REVIEW_COUNT) break;
    slots.push(k.id);
  }
  const cycle = [...due, ...rest].map((k) => k.id);
  for (let i = 0; slots.length < REVIEW_COUNT; i++) slots.push(cycle[i % cycle.length] as CardId);

  const withKeys = keyboardUnlocked(p);
  const mix: LessonDef['mix'] = withKeys
    ? { 'name-note': 70, 'find-key-letter': 30 }
    : { 'name-note': 100 };
  const questions = orderWithoutRepeats(slots, rand).map((card) => {
    if (!isSignCard(card)) return noteQuestion(pickKind(mix, rand), card, 'single', rand);
    // A sharp or flat card: naming 70 %, the exact key 30 % (only once the keyboard is unlocked).
    const kind = withKeys && rand() >= 0.7 ? 'find-key-pitch' : 'name-accidental';
    return noteQuestion(kind, card, 'single', rand);
  });
  return {
    context: { kind: 'review' },
    conceptCards: [],
    meetCards: [],
    questions,
    retries: true,
  };
}

/**
 * Builds a 15-question test over a checkpoint's pool, with no retries: name-the-note for the
 * part-1 checkpoints, else the checkpoint's own `mix` (cp-d is all name-accidental).
 */
export function buildCheckpoint(cp: CheckpointDef, seed: number): LessonPlan {
  const rand = mulberry32(seed);
  const shuffled = shuffle(cp.pool, rand);
  const slots: CardId[] = shuffled.slice(0, CHECKPOINT_COUNT);
  for (let i = 0; slots.length < CHECKPOINT_COUNT; i++) {
    slots.push(shuffled[Math.floor(rand() * shuffled.length)] as CardId);
  }
  // Each card is used at most twice here (pools are 11+ cards), so a repeat-free order exists.
  const questions = orderWithoutRepeats(slots, rand).map((card) =>
    noteQuestion(cp.mix ? pickKind(cp.mix, rand) : 'name-note', card, 'single', rand),
  );
  return {
    context: { kind: 'checkpoint', id: cp.id },
    conceptCards: [],
    meetCards: [],
    questions,
    retries: false,
  };
}
