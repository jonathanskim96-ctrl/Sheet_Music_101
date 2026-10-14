import { NATURAL_CARDS, parseCardId, type CardId } from '../../domain/cards';
import type { Clef, Note } from '../../domain/notes';
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
  return `${parsed.clef === 'treble' ? 'Treble' : 'Bass'} ${parsed.note.charAt(0)}`;
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

/** Whole-number first-try accuracy over every question answered, or null before any. */
export function overallAccuracy(p: Progress): number | null {
  const { questionsAnswered, correctFirstTry } = p.totals;
  if (questionsAnswered === 0) return null;
  return Math.round((Math.min(correctFirstTry, questionsAnswered) / questionsAnswered) * 100);
}
