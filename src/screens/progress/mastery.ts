import { NATURAL_CARDS, SIGN_CARDS, parseCardId, type CardId } from '../../domain/cards';
import { pitchName, type Clef, type Note, type Sign } from '../../domain/notes';
import { NICKNAMES } from '../../domain/content';
import type { Progress } from '../../domain/progress';
import { masteryOf } from '../../domain/srs';

export type Mastery = ReturnType<typeof masteryOf>;

export const MASTERY_WORDS: Record<Mastery, string> = {
  new: 'New',
  learning: 'Learning',
  almost: 'Almost',
  known: 'Known',
};

export interface ChartNote {
  card: CardId;
  clef: Clef;
  note: Note;
  column: number;
  /** The sign printed before the head (the sharp/flat chart only). */
  sign?: Sign;
  mastery: Mastery;
  /** "Treble G · Known · 12/13 correct" (SPEC 7.2). */
  label: string;
}

/** "Treble G", "Middle C", or the clef and letter ("Bass A") for cards without a nickname. */
export function chartName(card: CardId): string {
  const nickname = NICKNAMES[card];
  if (nickname !== undefined) return nickname;
  const parsed = parseCardId(card);
  if (!parsed) return card;
  const name = pitchName({ note: parsed.note, sign: parsed.sign });
  return `${parsed.clef === 'treble' ? 'Treble' : 'Bass'} ${name}`;
}

/**
 * All 34 cards for the chart. Each staff spreads its 17 cards left to right in pitch order and
 * the two staves share the columns (owner decision 2026-10-13).
 */
export function chartNotes(p: Progress): ChartNote[] {
  const perClef = { treble: 0, bass: 0 };
  return NATURAL_CARDS.flatMap((card) => {
    const parsed = parseCardId(card);
    if (!parsed) return [];
    const { clef, note } = parsed;
    const column = perClef[clef]++;
    const state = Object.hasOwn(p.cards, card) ? p.cards[card] : undefined;
    const mastery = masteryOf(state);
    const parts = [chartName(card), MASTERY_WORDS[mastery]];
    if (state) parts.push(`${String(state.correct)}/${String(state.seen)} correct`);
    return [{ card, clef, note, column, mastery, label: parts.join(' · ') }];
  });
}

/**
 * The 12 sharp/flat cards for the second chart: 6 columns, each staff in pitch order, the sign
 * drawn before the head (SPEC 8.11).
 */
export function signChartNotes(p: Progress): ChartNote[] {
  const perClef = { treble: 0, bass: 0 };
  return SIGN_CARDS.flatMap((card) => {
    const parsed = parseCardId(card);
    if (!parsed) return [];
    const { clef, note, sign } = parsed;
    const column = perClef[clef]++;
    const state = Object.hasOwn(p.cards, card) ? p.cards[card] : undefined;
    const mastery = masteryOf(state);
    const parts = [chartName(card), MASTERY_WORDS[mastery]];
    if (state) parts.push(`${String(state.correct)}/${String(state.seen)} correct`);
    return [{ card, clef, note, column, sign, mastery, label: parts.join(' · ') }];
  });
}

/** Whole-number first-try accuracy over every question answered, or null before any. */
export function overallAccuracy(p: Progress): number | null {
  const { questionsAnswered, correctFirstTry } = p.totals;
  if (questionsAnswered === 0) return null;
  return Math.round((Math.min(correctFirstTry, questionsAnswered) / questionsAnswered) * 100);
}
