import { describe, expect, it } from 'vitest';
import { ALL_CARDS, parseCardId } from './cards';
import { UNIT1_KEYBOARD, keyboardWindow } from './keyboardWindow';
import { LETTERS, diatonicIndex, noteFromDiatonic, type Note } from './notes';

describe('keyboardWindow', () => {
  it('maps the documented examples', () => {
    expect(keyboardWindow('C2')).toEqual({ from: 'C2', to: 'B3' });
    expect(keyboardWindow('C6')).toEqual({ from: 'C5', to: 'B6' });
    expect(keyboardWindow('C4')).toEqual({ from: 'C3', to: 'B4' });
    expect(keyboardWindow('G4')).toEqual({ from: 'C4', to: 'B5' });
    expect(keyboardWindow('E4')).toEqual({ from: 'C3', to: 'B4' });
    expect(keyboardWindow('F4')).toEqual({ from: 'C4', to: 'B5' });
    expect(keyboardWindow('A3')).toEqual({ from: 'C3', to: 'B4' });
  });
  it('unit 1 uses C3-B4', () => {
    expect(UNIT1_KEYBOARD).toEqual({ from: 'C3', to: 'B4' });
  });
  it('contains the note and has exactly 14 white keys for every card', () => {
    for (const id of ALL_CARDS) {
      const c = parseCardId(id);
      if (!c) throw new Error(id);
      const w = keyboardWindow(c.note);
      const lo = diatonicIndex(w.from);
      const hi = diatonicIndex(w.to);
      const d = diatonicIndex(c.note);
      expect(hi - lo + 1, id).toBe(14);
      expect(d >= lo && d <= hi, `${id} in ${w.from}-${w.to}`).toBe(true);
      expect(w.from.startsWith('C')).toBe(true);
      expect(w.to.startsWith('B')).toBe(true);
    }
  });
  it('is valid for every note C2..B6 (letters cover all seven)', () => {
    for (let i = 14; i <= 48; i++) {
      const n = noteFromDiatonic(i) as Note;
      const w = keyboardWindow(n);
      expect(noteFromDiatonic(diatonicIndex(w.from))).toBe(w.from);
      expect(noteFromDiatonic(diatonicIndex(w.to))).toBe(w.to);
    }
    expect(LETTERS).toHaveLength(7);
  });
});
