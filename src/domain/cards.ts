import { pitchMidi, staffPosition, type Clef, type Note, type Sign } from './notes';

/** The 12 sharp/flat cards (course part 2), treble then bass, low to high; the one source of truth. */
const SIGN_TABLE = [
  { id: 'treble-F#4', clef: 'treble', note: 'F4', sign: 'sharp' },
  { id: 'treble-G#4', clef: 'treble', note: 'G4', sign: 'sharp' },
  { id: 'treble-Ab4', clef: 'treble', note: 'A4', sign: 'flat' },
  { id: 'treble-Bb4', clef: 'treble', note: 'B4', sign: 'flat' },
  { id: 'treble-C#5', clef: 'treble', note: 'C5', sign: 'sharp' },
  { id: 'treble-Eb5', clef: 'treble', note: 'E5', sign: 'flat' },
  { id: 'bass-Ab2', clef: 'bass', note: 'A2', sign: 'flat' },
  { id: 'bass-Bb2', clef: 'bass', note: 'B2', sign: 'flat' },
  { id: 'bass-C#3', clef: 'bass', note: 'C3', sign: 'sharp' },
  { id: 'bass-Eb3', clef: 'bass', note: 'E3', sign: 'flat' },
  { id: 'bass-F#3', clef: 'bass', note: 'F3', sign: 'sharp' },
  { id: 'bass-G#3', clef: 'bass', note: 'G3', sign: 'sharp' },
] as const satisfies readonly { id: string; clef: Clef; note: Note; sign: 'sharp' | 'flat' }[];

export type NaturalCardId = `${Clef}-${Note}`;
export type SignCardId = (typeof SIGN_TABLE)[number]['id'];
export type CardId = NaturalCardId | SignCardId;

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

/** Builds the card id for a natural note in a clef. */
export function cardId(clef: Clef, note: Note): NaturalCardId {
  return `${clef}-${note}`;
}

/** The 34 natural cards: the treble run then the bass run, low to high. Part 1 uses only these. */
export const NATURAL_CARDS: readonly NaturalCardId[] = [
  ...TREBLE.map((n) => cardId('treble', n)),
  ...BASS.map((n) => cardId('bass', n)),
];

/** The 12 sharp/flat cards (course part 2), all inside the staff: treble then bass, low to high. */
export const SIGN_CARDS: readonly SignCardId[] = SIGN_TABLE.map((row) => row.id);

/** All 46 cards: the 34 naturals (same order as always) then the 12 sign cards. */
export const ALL_CARDS: readonly CardId[] = [...NATURAL_CARDS, ...SIGN_CARDS];

type ParsedCard = { clef: Clef; note: Note; sign: Sign };

const CARD_LOOKUP: ReadonlyMap<string, ParsedCard> = new Map([
  ...TREBLE.map((n): [string, ParsedCard] => [
    cardId('treble', n),
    { clef: 'treble', note: n, sign: 'natural' },
  ]),
  ...BASS.map((n): [string, ParsedCard] => [
    cardId('bass', n),
    { clef: 'bass', note: n, sign: 'natural' },
  ]),
  ...SIGN_TABLE.map((r): [string, ParsedCard] => [
    r.id,
    { clef: r.clef, note: r.note, sign: r.sign },
  ]),
]);

/** True when `s` is one of the 46 real card ids. */
export function isCardId(s: unknown): s is CardId {
  return typeof s === 'string' && CARD_LOOKUP.has(s);
}

/** True when `id` is one of the 34 natural cards (everything in course part 1). */
export function isNaturalCard(id: CardId): id is NaturalCardId {
  return CARD_LOOKUP.get(id)?.sign === 'natural';
}

const SIGN_SET: ReadonlySet<string> = new Set(SIGN_CARDS);

/** True for the 12 sharp/flat cards (and false for anything else, including junk). */
export function isSignCard(id: CardId): id is SignCardId {
  return SIGN_SET.has(id);
}

/** Splits a card id into clef, written note and sign; null for anything that is not a real card. */
export function parseCardId(s: string): ParsedCard | null {
  const hit = CARD_LOOKUP.get(s);
  return hit ? { clef: hit.clef, note: hit.note, sign: hit.sign } : null;
}

/** Staff position of a card on its own clef (a sign card sits where its letter sits). */
export function cardPosition(id: CardId): number {
  const c = parseCardId(id);
  return c ? staffPosition(c.clef, c.note) : 0;
}

/** MIDI number of the sound a card stands for (F♯4 is one above F4). */
export function cardMidi(id: CardId): number {
  const c = parseCardId(id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return pitchMidi({ note: c.note, sign: c.sign });
}
