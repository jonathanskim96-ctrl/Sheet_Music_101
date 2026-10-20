import { cardMidi, parseCardId, type CardId } from './cards';
import {
  LETTERS,
  diatonicIndex,
  letterOf,
  noteAtPosition,
  staffPosition,
  type Clef,
  type Letter,
  type Note,
  type Sign,
} from './notes';
import { shuffle } from './rng';

/** One answer button of a name-accidental question: a letter and its sign ('natural' = plain). */
export type PitchOption = { letter: Letter; sign: Sign };

export type Question =
  | { kind: 'name-note'; card: CardId; render: 'single' | 'grand' }
  | { kind: 'find-key-letter'; card: CardId; render: 'single' | 'grand' } // any key with the right letter
  | { kind: 'find-key-exact'; card: CardId; render: 'single' | 'grand' } // the exact key
  | { kind: 'find-on-staff'; card: CardId } // tap a position with that letter (any octave)
  | { kind: 'step-skip'; clef: Clef; first: Note; second: Note; buttons: 2 | 4 }
  | { kind: 'alphabet-next'; letter: Letter; direction: 'after' | 'before' }
  | { kind: 'keyboard-letter'; letter: Letter }
  | { kind: 'line-or-space'; position: number } // 0..8, drawn on a staff with no clef
  | { kind: 'higher-lower'; first: Note; second: Note } // treble staff; different notes
  | { kind: 'clef-identify'; clef: Clef }
  // Course part 2 (SPEC 8.6). `showNatural` draws a natural card with a printed natural sign.
  | {
      kind: 'name-accidental';
      card: CardId;
      render: 'single' | 'grand';
      showNatural: boolean;
      options: PitchOption[];
    }
  | { kind: 'find-key-pitch'; card: CardId; render: 'single' | 'grand' }; // the exact key, black keys too

export type ChoiceValue =
  | 'line'
  | 'space'
  | 'first'
  | 'second'
  | 'treble'
  | 'bass'
  | 'step-up'
  | 'step-down'
  | 'skip-up'
  | 'skip-down';

export type Answer =
  | { kind: 'letter'; letter: Letter }
  | { kind: 'key'; note: Note | 'black' }
  | { kind: 'position'; position: number }
  | { kind: 'choice'; value: ChoiceValue }
  | { kind: 'pitch-name'; letter: Letter; sign: Sign }
  | { kind: 'pitch-key'; midi: number };

function cardParts(card: CardId): { clef: Clef; note: Note } {
  const parts = parseCardId(card);
  if (!parts) throw new Error(`Unknown card: ${card}`);
  // Part-1 kinds only ever get natural cards (SPEC 8.1); a sign card would silently use the white key.
  if (parts.sign !== 'natural') {
    throw new Error(`Question not supported for sign card ${card} (part-1 kinds are natural only)`);
  }
  return parts;
}

/** The letter and sign a card stands for, for the part-2 kinds that accept sign cards. */
function pitchOfCard(card: CardId): PitchOption {
  const parts = parseCardId(card);
  if (!parts) throw new Error(`Unknown card: ${card}`);
  return { letter: letterOf(parts.note), sign: parts.sign };
}

/** The 7 plain names and the 6 sharp/flat names the course teaches; nothing else is ever offered. */
const VALID_NAMES: ReadonlySet<string> = new Set([
  ...LETTERS.map((l) => `${l}natural`),
  'Fsharp',
  'Csharp',
  'Gsharp',
  'Bflat',
  'Eflat',
  'Aflat',
]);

/**
 * The answer buttons of a name-accidental question (SPEC 8.6): candidates in order (same letter
 * plain, ♯, ♭, the letter above and below with the card's sign), minus the right answer and any
 * name outside the 13 the course uses; the first 3 plus the right answer, shuffled. Fewer than
 * 3 candidates survive for some cards (C♯ gets 2 buttons): owner decision 2026-10-20.
 */
export function pitchOptions(card: CardId, rand: () => number): PitchOption[] {
  const right = pitchOfCard(card);
  const i = LETTERS.indexOf(right.letter);
  const above = LETTERS[(i + 1) % 7] ?? right.letter;
  const below = LETTERS[(i + 6) % 7] ?? right.letter;
  const candidates: PitchOption[] = [
    { letter: right.letter, sign: 'natural' },
    { letter: right.letter, sign: 'sharp' },
    { letter: right.letter, sign: 'flat' },
    { letter: above, sign: right.sign },
    { letter: below, sign: right.sign },
  ];
  const seen = new Set<string>([`${right.letter}${right.sign}`]);
  const kept: PitchOption[] = [];
  for (const c of candidates) {
    const key = `${c.letter}${c.sign}`;
    if (seen.has(key) || !VALID_NAMES.has(key)) continue;
    seen.add(key);
    kept.push(c);
  }
  return shuffle([...kept.slice(0, 3), right], rand);
}

function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

/** Which button value describes the move from `first` to `second` (step = 1 letter, skip = 2). */
export function stepSkipValue(first: Note, second: Note): ChoiceValue {
  const d = diatonicIndex(second) - diatonicIndex(first);
  const dir = d > 0 ? 'up' : 'down';
  return Math.abs(d) === 1 ? (`step-${dir}` as ChoiceValue) : (`skip-${dir}` as ChoiceValue);
}

/** The answer the app treats as right (used for feedback and the e2e hook). */
export function correctAnswerOf(q: Question): Answer {
  switch (q.kind) {
    case 'name-note':
      return { kind: 'letter', letter: letterOf(cardParts(q.card).note) };
    case 'find-key-letter':
    case 'find-key-exact':
      return { kind: 'key', note: cardParts(q.card).note };
    case 'find-on-staff': {
      const { clef, note } = cardParts(q.card);
      return { kind: 'position', position: staffPosition(clef, note) };
    }
    case 'step-skip':
      return { kind: 'choice', value: stepSkipValue(q.first, q.second) };
    case 'alphabet-next': {
      const i = LETTERS.indexOf(q.letter);
      const j = (i + (q.direction === 'after' ? 1 : 6)) % 7;
      return { kind: 'letter', letter: LETTERS[j] ?? q.letter };
    }
    case 'keyboard-letter':
      return { kind: 'key', note: `${q.letter}4` };
    case 'line-or-space':
      return { kind: 'choice', value: q.position % 2 === 0 ? 'line' : 'space' };
    case 'higher-lower':
      return {
        kind: 'choice',
        value: diatonicIndex(q.first) > diatonicIndex(q.second) ? 'first' : 'second',
      };
    case 'clef-identify':
      return { kind: 'choice', value: q.clef };
    case 'name-accidental':
      return { kind: 'pitch-name', ...pitchOfCard(q.card) };
    case 'find-key-pitch':
      return { kind: 'pitch-key', midi: cardMidi(q.card) };
    default:
      return assertNever(q);
  }
}

/** True when `a` is a right answer to `q`; an answer of the wrong type is simply wrong. */
export function checkAnswer(q: Question, a: Answer): boolean {
  switch (q.kind) {
    case 'name-note':
    case 'alphabet-next':
      return (
        a.kind === 'letter' &&
        a.letter === (correctAnswerOf(q) as Extract<Answer, { kind: 'letter' }>).letter
      );
    case 'find-key-letter':
      return (
        a.kind === 'key' &&
        a.note !== 'black' &&
        letterOf(a.note) === letterOf(cardParts(q.card).note)
      );
    case 'find-key-exact':
      return a.kind === 'key' && a.note === cardParts(q.card).note;
    case 'keyboard-letter':
      return a.kind === 'key' && a.note !== 'black' && letterOf(a.note) === q.letter;
    case 'find-on-staff': {
      if (a.kind !== 'position') return false;
      const { clef, note } = cardParts(q.card);
      const hit = noteAtPosition(clef, a.position);
      return hit !== null && letterOf(hit) === letterOf(note);
    }
    case 'step-skip':
    case 'line-or-space':
    case 'higher-lower':
    case 'clef-identify':
      return (
        a.kind === 'choice' &&
        a.value === (correctAnswerOf(q) as Extract<Answer, { kind: 'choice' }>).value
      );
    case 'name-accidental': {
      const right = pitchOfCard(q.card);
      return a.kind === 'pitch-name' && a.letter === right.letter && a.sign === right.sign;
    }
    case 'find-key-pitch':
      return a.kind === 'pitch-key' && a.midi === cardMidi(q.card);
    default:
      return assertNever(q);
  }
}

/**
 * The staff position (-4..12, the tappable range) holding the card's letter that is nearest to
 * `position`; a tie goes to the lower one. Feedback for find-on-staff draws a note there.
 */
export function nearestCorrectPosition(card: CardId, position: number): number {
  const { clef, note } = cardParts(card);
  let best = staffPosition(clef, note);
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let p = -4; p <= 12; p++) {
    const at = noteAtPosition(clef, p);
    if (at === null || letterOf(at) !== letterOf(note)) continue;
    const distance = Math.abs(p - position);
    if (distance < bestDistance) {
      best = p;
      bestDistance = distance;
    }
  }
  return best;
}

/** The card a question is about; only note questions have one. */
export function cardOf(q: Question): CardId | null {
  switch (q.kind) {
    case 'name-note':
    case 'find-key-letter':
    case 'find-key-exact':
    case 'find-on-staff':
    case 'name-accidental':
    case 'find-key-pitch':
      return q.card;
    case 'step-skip':
    case 'alphabet-next':
    case 'keyboard-letter':
    case 'line-or-space':
    case 'higher-lower':
    case 'clef-identify':
      return null;
    default:
      return assertNever(q);
  }
}
