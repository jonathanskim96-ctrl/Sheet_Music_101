import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  LETTERS,
  diatonicIndex,
  frequency,
  letterOf,
  midiNumber,
  noteAtPosition,
  noteFromDiatonic,
  octaveOf,
  parseNote,
  pitchMidi,
  pitchName,
  staffPosition,
  type Clef,
  type Note,
  type Sign,
} from './notes';
import { SIGN_CARDS, cardMidi, parseCardId } from './cards';

// [clef, note, diatonic index, staff position, midi, frequency (Hz, 2 decimals)]
const TABLE: [Clef, Note, number, number, number, number][] = [
  ['treble', 'A3', 26, -4, 57, 220.0],
  ['treble', 'B3', 27, -3, 59, 246.94],
  ['treble', 'C4', 28, -2, 60, 261.63],
  ['treble', 'D4', 29, -1, 62, 293.66],
  ['treble', 'E4', 30, 0, 64, 329.63],
  ['treble', 'F4', 31, 1, 65, 349.23],
  ['treble', 'G4', 32, 2, 67, 392.0],
  ['treble', 'A4', 33, 3, 69, 440.0],
  ['treble', 'B4', 34, 4, 71, 493.88],
  ['treble', 'C5', 35, 5, 72, 523.25],
  ['treble', 'D5', 36, 6, 74, 587.33],
  ['treble', 'E5', 37, 7, 76, 659.26],
  ['treble', 'F5', 38, 8, 77, 698.46],
  ['treble', 'G5', 39, 9, 79, 783.99],
  ['treble', 'A5', 40, 10, 81, 880.0],
  ['treble', 'B5', 41, 11, 83, 987.77],
  ['treble', 'C6', 42, 12, 84, 1046.5],
  ['bass', 'C2', 14, -4, 36, 65.41],
  ['bass', 'D2', 15, -3, 38, 73.42],
  ['bass', 'E2', 16, -2, 40, 82.41],
  ['bass', 'F2', 17, -1, 41, 87.31],
  ['bass', 'G2', 18, 0, 43, 98.0],
  ['bass', 'A2', 19, 1, 45, 110.0],
  ['bass', 'B2', 20, 2, 47, 123.47],
  ['bass', 'C3', 21, 3, 48, 130.81],
  ['bass', 'D3', 22, 4, 50, 146.83],
  ['bass', 'E3', 23, 5, 52, 164.81],
  ['bass', 'F3', 24, 6, 53, 174.61],
  ['bass', 'G3', 25, 7, 55, 196.0],
  ['bass', 'A3', 26, 8, 57, 220.0],
  ['bass', 'B3', 27, 9, 59, 246.94],
  ['bass', 'C4', 28, 10, 60, 261.63],
  ['bass', 'D4', 29, 11, 62, 293.66],
  ['bass', 'E4', 30, 12, 64, 329.63],
];

const anyNote = fc
  .tuple(fc.constantFrom(...LETTERS), fc.constantFrom(2, 3, 4, 5, 6))
  .map(([l, o]) => `${l}${String(o)}` as Note);

describe('notes table (all 34 cards)', () => {
  it('has 34 rows', () => {
    expect(TABLE).toHaveLength(34);
  });
  for (const [clef, note, d, p, midi, hz] of TABLE) {
    it(`${clef} ${note}`, () => {
      expect(diatonicIndex(note)).toBe(d);
      expect(staffPosition(clef, note)).toBe(p);
      expect(midiNumber(note)).toBe(midi);
      expect(Math.round(frequency(note) * 100) / 100).toBe(hz);
      expect(noteAtPosition(clef, p)).toBe(note);
      expect(noteFromDiatonic(d)).toBe(note);
    });
  }
});

describe('notes basics', () => {
  it('A4 is 440 Hz exactly and C4 is midi 60', () => {
    expect(frequency('A4')).toBe(440);
    expect(midiNumber('C4')).toBe(60);
    expect(diatonicIndex('C4')).toBe(28);
  });
  it('splits letters and octaves', () => {
    expect(letterOf('G4')).toBe('G');
    expect(octaveOf('G4')).toBe(4);
  });
  it('parseNote accepts every C2..B6 name', () => {
    for (let i = 14; i <= 48; i++) {
      const n = noteFromDiatonic(i);
      expect(n).not.toBeNull();
      expect(parseNote(n as string)).toBe(n);
    }
  });
  it.each(['H4', 'C7', 'c4', '', 'C4 ', ' C4', 'C', 'C1', 'C44', 'C#4', 'C4\n'])(
    'parseNote rejects %j',
    (s) => {
      expect(parseNote(s)).toBeNull();
    },
  );
  it('noteFromDiatonic is null outside C2..B6 and for non-integers', () => {
    expect(noteFromDiatonic(13)).toBeNull();
    expect(noteFromDiatonic(49)).toBeNull();
    expect(noteFromDiatonic(-1)).toBeNull();
    expect(noteFromDiatonic(14.5)).toBeNull();
    expect(noteFromDiatonic(Number.NaN)).toBeNull();
    expect(noteFromDiatonic(14)).toBe('C2');
    expect(noteFromDiatonic(48)).toBe('B6');
  });
  it('noteAtPosition is null off the range and for non-integers', () => {
    expect(noteAtPosition('treble', 0.5)).toBeNull();
    expect(noteAtPosition('bass', -5)).toBeNull();
    expect(noteAtPosition('treble', 100)).toBeNull();
    expect(noteAtPosition('treble', -100)).toBeNull();
  });
});

describe('notes properties', () => {
  it('noteFromDiatonic ∘ diatonicIndex is the identity', () => {
    fc.assert(fc.property(anyNote, (n) => noteFromDiatonic(diatonicIndex(n)) === n));
  });
  it('noteAtPosition ∘ staffPosition is the identity on both clefs', () => {
    fc.assert(
      fc.property(anyNote, fc.constantFrom<Clef>('treble', 'bass'), (n, clef) => {
        return noteAtPosition(clef, staffPosition(clef, n)) === n;
      }),
    );
  });
  it('midi rises with the diatonic index', () => {
    fc.assert(
      fc.property(anyNote, anyNote, (a, b) => {
        const da = diatonicIndex(a);
        const db = diatonicIndex(b);
        return da === db || da < db === midiNumber(a) < midiNumber(b);
      }),
    );
  });
});

describe('pitches (SPEC 8.1)', () => {
  it('pitchMidi moves the written note by one semitone for a sharp or flat', () => {
    expect(pitchMidi({ note: 'F4', sign: 'sharp' })).toBe(66);
    expect(pitchMidi({ note: 'B4', sign: 'flat' })).toBe(70);
    expect(pitchMidi({ note: 'F4', sign: 'natural' })).toBe(65);
    expect(pitchMidi({ note: 'C5', sign: 'sharp' })).toBe(73);
    expect(pitchMidi({ note: 'A2', sign: 'flat' })).toBe(44);
  });
  it('pitchName shows the letter and the symbol, never an octave digit', () => {
    expect(pitchName({ note: 'F4', sign: 'sharp' })).toBe('F\u266F');
    expect(pitchName({ note: 'B4', sign: 'flat' })).toBe('B\u266D');
    expect(pitchName({ note: 'F4', sign: 'natural' })).toBe('F');
    fc.assert(
      fc.property(anyNote, fc.constantFrom<Sign>('sharp', 'flat', 'natural'), (note, sign) => {
        expect(pitchName({ note, sign })).not.toMatch(/\d/);
        expect(pitchMidi({ note, sign }) - midiNumber(note)).toBe(
          sign === 'sharp' ? 1 : sign === 'flat' ? -1 : 0,
        );
      }),
    );
  });
  it('every one of the 12 sign cards has a sensible pitch name and sound', () => {
    for (const id of SIGN_CARDS) {
      const c = parseCardId(id);
      expect(c).not.toBeNull();
      if (!c) continue;
      const name = pitchName({ note: c.note, sign: c.sign });
      expect(name).toMatch(/^[A-G][\u266F\u266D]$/);
      expect(cardMidi(id)).toBe(pitchMidi({ note: c.note, sign: c.sign }));
    }
  });
});
