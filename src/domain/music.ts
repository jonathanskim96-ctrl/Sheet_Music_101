import { isCardId, type CardId } from './cards';
import {
  parseNote,
  staffPosition,
  type Clef,
  type Letter,
  type Note,
  type Pitch,
  type Sign,
} from './notes';

export type Beats = 1 | 2 | 3 | 4;
/** Note lengths: q 1 beat, h 2, h. 3, w 4; ee is a pair of half-beat notes (1 beat in total). */
export type Dur = 'q' | 'h' | 'h.' | 'w' | 'ee';
export type RestDur = 'Q' | 'H' | 'W';
export type RhythmToken = Dur | RestDur;
/** Beats per box (the bottom number is always 4). */
export type Time = 2 | 3 | 4;
/** G: F♯; F: B♭; D: F♯ C♯; Bb: B♭ E♭. */
export type HomeSign = 'none' | 'G' | 'F' | 'D' | 'Bb';
export interface WrittenNote {
  note: Note;
  /** The sign printed in front of the note, or null when none is printed. */
  printed: Sign | null;
}
export type MusicEvent =
  { kind: 'note'; dur: Exclude<Dur, 'ee'>; notes: WrittenNote[] } | { kind: 'rest'; dur: RestDur };
export interface Staffline {
  clef: Clef;
  boxes: MusicEvent[][];
}
export interface Melody {
  id: string;
  time: Time;
  home: HomeSign;
  /** [treble, bass] when it is a grand staff. */
  staffs: [Staffline] | [Staffline, Staffline];
}

const BEATS: Record<RhythmToken, number> = {
  q: 1,
  h: 2,
  'h.': 3,
  w: 4,
  ee: 1,
  Q: 1,
  H: 2,
  W: 4,
};

/** How many beats a note or rest lasts. */
export function beatsOf(t: RhythmToken): number {
  return BEATS[t];
}

/** Beats of one music event (a rest or a note or stack). */
export function eventBeats(e: MusicEvent): number {
  return BEATS[e.dur];
}

function isRhythmToken(s: string): s is RhythmToken {
  return Object.hasOwn(BEATS, s);
}

/** Parses 'q q h' style rhythm text (space separated); null for anything unknown or empty. */
export function parseRhythm(s: string): RhythmToken[] | null {
  if (s === '') return null;
  const out: RhythmToken[] = [];
  for (const part of s.split(' ')) {
    if (!isRhythmToken(part)) return null;
    out.push(part);
  }
  return out;
}

const NOTE_TOKEN = /^([A-G])(#|b|n)?([2-6])(q|h\.|h|w)$/;
const PRINTED: Record<string, Sign> = { '#': 'sharp', b: 'flat', n: 'natural' };
/** Lowest and highest staff position that fits on the drawing (a single staff fits -6..14). */
const MIN_POSITION = -6;
const MAX_POSITION = 14;

function parseEvent(clef: Clef, token: string): MusicEvent | null {
  if (token === 'Q' || token === 'H' || token === 'W') return { kind: 'rest', dur: token };
  const m = NOTE_TOKEN.exec(token);
  if (!m) return null;
  const [, letter, sign, octave, dur] = m;
  if (letter === undefined || octave === undefined || dur === undefined) return null;
  const note = parseNote(`${letter}${octave}`);
  if (note === null) return null;
  const p = staffPosition(clef, note);
  if (p < MIN_POSITION || p > MAX_POSITION) return null;
  return {
    kind: 'note',
    dur: dur as Exclude<Dur, 'ee'>,
    notes: [{ note, printed: sign === undefined ? null : (PRINTED[sign] ?? null) }],
  };
}

/** Parses music text such as 'C4q D4q | G4w' into boxes of events; null if any token is bad. */
export function parseMusic(clef: Clef, s: string): MusicEvent[][] | null {
  if (s === '') return null;
  const boxes: MusicEvent[][] = [];
  for (const boxText of s.split(' | ')) {
    if (boxText === '') return null;
    const box: MusicEvent[] = [];
    for (const token of boxText.split(' ')) {
      const ev = parseEvent(clef, token);
      if (ev === null) return null;
      box.push(ev);
    }
    boxes.push(box);
  }
  return boxes;
}

/** The signs a home sign puts in front of letters everywhere, in the order they are drawn. */
export const HOME_SIGN_LETTERS: Record<HomeSign, readonly { letter: Letter; sign: Sign }[]> = {
  none: [],
  G: [{ letter: 'F', sign: 'sharp' }],
  F: [{ letter: 'B', sign: 'flat' }],
  D: [
    { letter: 'F', sign: 'sharp' },
    { letter: 'C', sign: 'sharp' },
  ],
  Bb: [
    { letter: 'B', sign: 'flat' },
    { letter: 'E', sign: 'flat' },
  ],
};

/**
 * What a written note sounds like. `noteIndex` picks one note of a stack (default: the only
 * note). Rules, in order: its own printed sign; the last sign printed on the same letter and
 * octave earlier in the same box of the same staff; the home sign for the letter; natural.
 */
export function soundingPitch(
  m: Melody,
  staff: 0 | 1,
  box: number,
  index: number,
  noteIndex = 0,
): Pitch {
  const events = m.staffs[staff]?.boxes[box];
  const ev = events?.[index];
  if (ev?.kind !== 'note') throw new RangeError('soundingPitch needs a note');
  const w = ev.notes[noteIndex];
  if (w === undefined) throw new RangeError('soundingPitch: no such note in the event');
  if (w.printed !== null) return { note: w.note, sign: w.printed };
  for (let i = index - 1; i >= 0; i--) {
    const earlier = events?.[i];
    if (earlier?.kind !== 'note') continue;
    for (let j = earlier.notes.length - 1; j >= 0; j--) {
      const e = earlier.notes[j];
      if (e?.note === w.note && e.printed !== null) return { note: w.note, sign: e.printed };
    }
  }
  const letter = w.note.charAt(0) as Letter;
  const home = HOME_SIGN_LETTERS[m.home].find((h) => h.letter === letter);
  return { note: w.note, sign: home?.sign ?? 'natural' };
}

const SIGN_ID: Record<Sign, string> = { sharp: '#', flat: 'b', natural: '' };

/** The card a written note sounds as; null only if the sounding pitch is not one of the 46 cards. */
export function soundingCard(
  m: Melody,
  staff: 0 | 1,
  box: number,
  index: number,
  noteIndex = 0,
): CardId | null {
  const clef = m.staffs[staff]?.clef;
  if (clef === undefined) return null;
  const p = soundingPitch(m, staff, box, index, noteIndex);
  const letter = p.note.charAt(0);
  const octave = p.note.slice(1);
  const id = `${clef}-${letter}${SIGN_ID[p.sign]}${octave}`;
  return isCardId(id) ? id : null;
}
