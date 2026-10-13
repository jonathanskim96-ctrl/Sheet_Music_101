import type { CardId } from './cards';
import { cardId, parseCardId } from './cards';
import { cardName } from './content';
import { diatonicIndex, staffPosition, type Clef, type Note } from './notes';
import type { Progress } from './progress';

/** The landmark cards in each clef (SPEC 4.16); their nicknames live in content.ts. */
export const LANDMARKS: Record<Clef, readonly CardId[]> = {
  treble: [
    cardId('treble', 'C4'),
    cardId('treble', 'G4'),
    cardId('treble', 'C5'),
    cardId('treble', 'C6'),
  ],
  bass: [cardId('bass', 'C2'), cardId('bass', 'C3'), cardId('bass', 'F3'), cardId('bass', 'C4')],
};

/**
 * Wrong-answer hint: how far the card is from the nearest landmark the learner has already met
 * in the same clef (ties go to the lower one). Null if none is learned or the card is itself that
 * landmark (a landmark not met yet still gets a hint from another one, SPEC 4.16).
 */
export function hintFor(card: CardId, p: Progress): string | null {
  const here = parseCardId(card);
  if (!here) return null;
  const mine = diatonicIndex(here.note);
  let best: { id: CardId; d: number; below: boolean } | null = null;
  for (const id of LANDMARKS[here.clef]) {
    if (p.cards[id] === undefined) continue;
    const lm = parseCardId(id);
    if (!lm) continue;
    const signed = mine - diatonicIndex(lm.note);
    const d = Math.abs(signed);
    // Landmarks are listed low to high, so on a tie the first (lower) one is kept.
    if (best === null || d < best.d) best = { id, d, below: signed < 0 };
  }
  if (best === null || best.d === 0) return null;
  const where = best.below ? 'below' : 'above';
  const name = cardName(best.id);
  return best.d === 1
    ? `It's one step ${where} ${name}.`
    : `It's ${String(best.d)} steps ${where} ${name}.`;
}

/** The "where it sits on the staff" sentence for the Meet card and wrong-answer feedback. */
export function describePosition(clef: Clef, note: Note): string {
  const p = staffPosition(clef, note);
  if (p >= 0 && p <= 8) {
    return p % 2 === 0
      ? `It sits on line ${String(p / 2 + 1)} (counting from the bottom).`
      : `It sits in space ${String((p + 1) / 2)} (counting from the bottom).`;
  }
  if (p === -1) return 'It sits just below the staff.';
  if (p === 9) return 'It sits just above the staff.';
  if (p <= -2) {
    return p % 2 === 0
      ? `It sits on ledger line ${String(-p / 2)} below the staff.`
      : `It sits just below ledger line ${String((-p - 1) / 2)} under the staff.`;
  }
  return p % 2 === 0
    ? `It sits on ledger line ${String((p - 8) / 2)} above the staff.`
    : `It sits just above ledger line ${String((p - 9) / 2)} over the staff.`;
}
