import { staffPosition, type Clef, type Note } from './notes';

export type CardId = `${Clef}-${Note}`;

const TREBLE: readonly Note[] = [
  'A3',
  'B3',
  'C4',
  'D4',
  'E4',
  'F4',
  'G4',
  'A4',
  'B4',
  'C5',
  'D5',
  'E5',
  'F5',
  'G5',
  'A5',
  'B5',
  'C6',
];
const BASS: readonly Note[] = [
  'C2',
  'D2',
  'E2',
  'F2',
  'G2',
  'A2',
  'B2',
  'C3',
  'D3',
  'E3',
  'F3',
  'G3',
  'A3',
  'B3',
  'C4',
  'D4',
  'E4',
];

/** Builds the card id for a note in a clef. */
export function cardId(clef: Clef, note: Note): CardId {
  return `${clef}-${note}`;
}

/** All 34 cards: the treble run then the bass run, low to high. */
export const ALL_CARDS: readonly CardId[] = [
  ...TREBLE.map((n) => cardId('treble', n)),
  ...BASS.map((n) => cardId('bass', n)),
];

const CARD_LOOKUP: ReadonlyMap<string, { clef: Clef; note: Note }> = new Map([
  ...TREBLE.map((n): [string, { clef: Clef; note: Note }] => [
    cardId('treble', n),
    { clef: 'treble', note: n },
  ]),
  ...BASS.map((n): [string, { clef: Clef; note: Note }] => [
    cardId('bass', n),
    { clef: 'bass', note: n },
  ]),
]);

/** True when `s` is one of the 34 real card ids. */
export function isCardId(s: unknown): s is CardId {
  return typeof s === 'string' && CARD_LOOKUP.has(s);
}

/** Splits a card id into clef and note; null for anything that is not a real card. */
export function parseCardId(s: string): { clef: Clef; note: Note } | null {
  const hit = CARD_LOOKUP.get(s);
  return hit ? { clef: hit.clef, note: hit.note } : null;
}

/** Staff position of a card on its own clef (convenience). */
export function cardPosition(id: CardId): number {
  const c = parseCardId(id);
  return c ? staffPosition(c.clef, c.note) : 0;
}
