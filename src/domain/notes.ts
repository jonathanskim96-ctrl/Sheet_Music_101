export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Clef = 'treble' | 'bass';
export type Note = `${Letter}${2 | 3 | 4 | 5 | 6}`; // 'C2' … 'B6'; only C2–C6 used

export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const SEMITONES: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^[A-G][2-6]$/;
const MIN_DIATONIC = 2 * 7; // C2
const MAX_DIATONIC = 6 * 7 + 6; // B6

/** Strictly parses a note name such as 'G4'; anything else (even 'c4' or 'C4 ') is null. */
export function parseNote(s: string): Note | null {
  return NOTE_RE.test(s) ? (s as Note) : null;
}

/** The letter part of a note. */
export function letterOf(n: Note): Letter {
  return n.charAt(0) as Letter;
}

/** The octave number of a note (internal only, never shown to learners). */
export function octaveOf(n: Note): number {
  return Number(n.charAt(1));
}

/** Position on the white-key ladder: octave * 7 + letter index, so C4 = 28. */
export function diatonicIndex(n: Note): number {
  return octaveOf(n) * 7 + LETTERS.indexOf(letterOf(n));
}

/** Inverse of diatonicIndex; null outside C2..B6. */
export function noteFromDiatonic(i: number): Note | null {
  if (!Number.isInteger(i) || i < MIN_DIATONIC || i > MAX_DIATONIC) return null;
  const letter = LETTERS[i % 7];
  if (letter === undefined) return null;
  return `${letter}${String(Math.floor(i / 7))}` as Note;
}

const CLEF_ORIGIN: Record<Clef, number> = { treble: 30, bass: 18 };

/** Staff position: 0 = bottom line, +1 per half space (treble E4 = 0, bass G2 = 0). */
export function staffPosition(clef: Clef, n: Note): number {
  return diatonicIndex(n) - CLEF_ORIGIN[clef];
}

/** Inverse of staffPosition; null when the note would fall outside C2..B6. */
export function noteAtPosition(clef: Clef, p: number): Note | null {
  if (!Number.isInteger(p)) return null;
  return noteFromDiatonic(p + CLEF_ORIGIN[clef]);
}

/** MIDI number, C4 = 60. */
export function midiNumber(n: Note): number {
  return (octaveOf(n) + 1) * 12 + SEMITONES[letterOf(n)];
}

/** Equal-temperament frequency in Hz, A4 = 440. */
export function frequency(n: Note): number {
  return 440 * 2 ** ((midiNumber(n) - 69) / 12);
}

export type Sign = 'sharp' | 'flat' | 'natural';
/** A sounding or written pitch: the white-key position plus a sign. */
export type Pitch = { note: Note; sign: Sign };

const SIGN_OFFSET: Record<Sign, number> = { sharp: 1, flat: -1, natural: 0 };
const SIGN_SYMBOL: Record<Sign, string> = { sharp: '\u266F', flat: '\u266D', natural: '' };

/** MIDI number of a pitch: the note's number moved by one semitone for a sharp or flat. */
export function pitchMidi(p: Pitch): number {
  return midiNumber(p.note) + SIGN_OFFSET[p.sign];
}

/** Letter plus sign symbol, no octave: 'F♯', 'B♭', 'F'. */
export function pitchName(p: Pitch): string {
  return `${letterOf(p.note)}${SIGN_SYMBOL[p.sign]}`;
}
