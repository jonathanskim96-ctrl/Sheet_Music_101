import { parseCardId, type CardId } from './cards';
import {
  LETTERS,
  diatonicIndex,
  letterOf,
  noteAtPosition,
  staffPosition,
  type Clef,
  type Letter,
  type Note,
} from './notes';

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
  | { kind: 'clef-identify'; clef: Clef };

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
  | { kind: 'choice'; value: ChoiceValue };

function cardParts(card: CardId): { clef: Clef; note: Note } {
  const parts = parseCardId(card);
  if (!parts) throw new Error(`Unknown card: ${card}`);
  return parts;
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
