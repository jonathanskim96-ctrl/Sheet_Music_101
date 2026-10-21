// Lessons and checkpoints whose questions come from material libraries (rhythm so far; SPEC 8.9).
import type { LessonDef, LessonMaterial, QuestionKind, RhythmSetId } from './curriculum';
import { EVENT_SETS, RHYTHM_PATTERNS, type RhythmPattern, type RhythmSet } from './library';
import { beatsOf, rhythmTimeline, type Dur, type RhythmToken, type Time } from './music';
import type { Question } from './questions';
import { pickWeighted, shuffle } from './rng';

type Mix = LessonDef['mix'];
type RhythmKind = 'beats-of' | 'which-longer' | 'count-box' | 'finish-box' | 'hear-rhythm';

/** Question kinds generated from material, in a fixed order so a seed picks the same kind every time. */
const MATERIAL_KINDS: readonly RhythmKind[] = [
  'beats-of',
  'which-longer',
  'count-box',
  'finish-box',
  'hear-rhythm',
];
/** Kinds the learner has to listen to: dropped when sound is off, never in checkpoints (SPEC 8.6). */
const LISTENING_KINDS: readonly QuestionKind[] = ['hear-rhythm'];

/** The mix without its listening kinds; the rest keeps its weights (they are only relative). */
export function withoutListening(mix: Mix): Mix {
  const out: Mix = {};
  for (const [kind, weight] of Object.entries(mix) as [QuestionKind, number][]) {
    if (!LISTENING_KINDS.includes(kind)) out[kind] = weight;
  }
  return out;
}

const REST = new Set<RhythmToken>(['Q', 'H', 'W']);
const baseSet = (id: RhythmSetId): RhythmSet => (id === 'RR-Q' ? 'RR' : id);

/** The one-box patterns of the listed sets; 'RR-Q' is the RR patterns that contain a 1-beat rest. */
export function patternsOf(ids: readonly RhythmSetId[] | undefined): RhythmPattern[] {
  const out: RhythmPattern[] = [];
  for (const id of ids ?? []) {
    for (const p of RHYTHM_PATTERNS) {
      if (p.set !== baseSet(id) || out.includes(p)) continue;
      if (id === 'RR-Q' && !p.tokens.includes('Q')) continue;
      out.push(p);
    }
  }
  return out;
}

/** The single events of the listed sets (each set already includes the sets before it). */
export function eventsOf(ids: readonly RhythmSetId[] | undefined): RhythmToken[] {
  const out: RhythmToken[] = [];
  for (const id of ids ?? [])
    for (const t of EVENT_SETS[baseSet(id)]) if (!out.includes(t)) out.push(t);
  return out;
}

/** What a pattern sounds like; two patterns with the same sound can't both be options. */
export const soundOf = (tokens: readonly RhythmToken[]): string =>
  JSON.stringify(rhythmTimeline(tokens));

function pick<T>(list: readonly T[], rand: () => number): T {
  const hit = list[Math.floor(rand() * list.length)];
  if (hit === undefined) throw new Error('Nothing to pick from: the lesson material is empty');
  return hit;
}

const isNote = (t: RhythmToken): t is Dur => !REST.has(t);

function beatsOfQuestion(m: LessonMaterial, rand: () => number): Question {
  return { kind: 'beats-of', token: pick(eventsOf(m.rhythmEvents), rand) };
}

function whichLongerQuestion(m: LessonMaterial, rand: () => number): Question {
  const notes = eventsOf(m.rhythmEvents).filter(isNote);
  const first = pick(notes, rand);
  const second = pick(
    notes.filter((t) => beatsOf(t) !== beatsOf(first)),
    rand,
  );
  return { kind: 'which-longer', first, second };
}

function countBoxQuestion(m: LessonMaterial, rand: () => number): Question {
  return { kind: 'count-box', box: [...pick(patternsOf(m.rhythmPatterns), rand).tokens] };
}

function finishBoxQuestion(m: LessonMaterial, rand: () => number): Question {
  const pattern = pick(
    patternsOf(m.rhythmPatterns).filter((p) => p.tokens.length >= 2),
    rand,
  );
  const missing = pattern.tokens[pattern.tokens.length - 1] as RhythmToken;
  // Two wrong options whose beats differ from the missing one's and from each other, so exactly
  // one option fills the box.
  const others = shuffle(
    eventsOf(m.rhythmEvents).filter((t) => beatsOf(t) !== beatsOf(missing)),
    rand,
  );
  const a = others[0];
  const b = others.find((t) => a !== undefined && beatsOf(t) !== beatsOf(a));
  if (a === undefined || b === undefined)
    throw new Error('Not enough different events for a finish-box');
  return {
    kind: 'finish-box',
    time: pattern.time,
    box: pattern.tokens.slice(0, -1),
    options: shuffle([missing, a, b], rand),
  };
}

function hearRhythmQuestion(m: LessonMaterial, rand: () => number): Question {
  // Patterns that sound different from each other, grouped by time; a time needs 3 of them.
  const byTime = new Map<Time, RhythmPattern[]>();
  for (const p of patternsOf(m.rhythmPatterns)) {
    const group = byTime.get(p.time) ?? [];
    if (!group.some((g) => soundOf(g.tokens) === soundOf(p.tokens))) group.push(p);
    byTime.set(p.time, group);
  }
  const times = [...byTime.entries()].filter(([, g]) => g.length >= 3);
  const [time, group] = pick(times, rand);
  const three = shuffle(group, rand).slice(0, 3);
  const answer = pick([0, 1, 2] as const, rand);
  return {
    kind: 'hear-rhythm',
    time,
    options: three.map((p) => [...p.tokens]),
    answer,
  };
}

/** One question of a rhythm kind from the lesson material. */
export function rhythmQuestion(kind: RhythmKind, m: LessonMaterial, rand: () => number): Question {
  switch (kind) {
    case 'beats-of':
      return beatsOfQuestion(m, rand);
    case 'which-longer':
      return whichLongerQuestion(m, rand);
    case 'count-box':
      return countBoxQuestion(m, rand);
    case 'finish-box':
      return finishBoxQuestion(m, rand);
    case 'hear-rhythm':
      return hearRhythmQuestion(m, rand);
    default: {
      const never: never = kind;
      throw new Error(`Unexpected kind: ${String(never)}`);
    }
  }
}

const same = (a: Question | undefined, b: Question): boolean =>
  a !== undefined && JSON.stringify(a) === JSON.stringify(b);

/** Gives up looking for a different question after this many tries (a tiny pool may only have one). */
const REPEAT_TRIES = 30;

/**
 * `count` questions picked by the mix from the material, never the same question twice in a row
 * (SPEC 8.9). The caller removes listening kinds first when sound is off.
 */
export function materialQuestions(
  mix: Mix,
  count: number,
  material: LessonMaterial,
  rand: () => number,
): Question[] {
  const kinds = MATERIAL_KINDS.filter((k) => (mix[k] ?? 0) > 0);
  if (kinds.length === 0) throw new Error('The question mix has no kinds this material can make');
  const weights = kinds.map((k) => mix[k] ?? 0);
  const out: Question[] = [];
  for (let i = 0; i < count; i++) {
    let q = rhythmQuestion(pickWeighted(kinds, weights, rand), material, rand);
    for (let t = 0; t < REPEAT_TRIES && same(out[i - 1], q); t++) {
      q = rhythmQuestion(pickWeighted(kinds, weights, rand), material, rand);
    }
    out.push(q);
  }
  return out;
}
