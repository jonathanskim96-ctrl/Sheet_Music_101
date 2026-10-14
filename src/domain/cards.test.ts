import { describe, expect, it } from 'vitest';
import {
  ALL_CARDS,
  NATURAL_CARDS,
  SIGN_CARDS,
  cardId,
  cardMidi,
  cardPosition,
  isCardId,
  isNaturalCard,
  isSignCard,
  parseCardId,
} from './cards';

describe('cards', () => {
  it('has exactly 34 unique natural cards in the specified order', () => {
    expect(NATURAL_CARDS).toHaveLength(34);
    expect(new Set(NATURAL_CARDS).size).toBe(34);
    expect(NATURAL_CARDS).toEqual([
      ...'A3 B3 C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6'.split(' ').map((n) => `treble-${n}`),
      ...'C2 D2 E2 F2 G2 A2 B2 C3 D3 E3 F3 G3 A3 B3 C4 D4 E4'.split(' ').map((n) => `bass-${n}`),
    ]);
  });

  it('has 12 sign cards after the 34 naturals: 46 in all', () => {
    expect(SIGN_CARDS).toEqual([
      ...'F#4 G#4 Ab4 Bb4 C#5 Eb5'.split(' ').map((n) => `treble-${n}`),
      ...'Ab2 Bb2 C#3 Eb3 F#3 G#3'.split(' ').map((n) => `bass-${n}`),
    ]);
    expect(ALL_CARDS).toEqual([...NATURAL_CARDS, ...SIGN_CARDS]);
    expect(ALL_CARDS).toHaveLength(46);
    expect(new Set(ALL_CARDS).size).toBe(46);
  });

  it('parseCardId splits every sign card into clef, written note and sign', () => {
    expect(parseCardId('treble-F#4')).toEqual({ clef: 'treble', note: 'F4', sign: 'sharp' });
    expect(parseCardId('treble-Bb4')).toEqual({ clef: 'treble', note: 'B4', sign: 'flat' });
    expect(parseCardId('bass-Eb3')).toEqual({ clef: 'bass', note: 'E3', sign: 'flat' });
    expect(parseCardId('bass-G#3')).toEqual({ clef: 'bass', note: 'G3', sign: 'sharp' });
    for (const id of SIGN_CARDS) {
      const parsed = parseCardId(id);
      expect(parsed).not.toBeNull();
      expect(parsed?.sign).not.toBe('natural');
      expect(isCardId(id)).toBe(true);
      expect(isSignCard(id)).toBe(true);
      expect(isNaturalCard(id)).toBe(false);
    }
    for (const id of NATURAL_CARDS) {
      expect(parseCardId(id)?.sign).toBe('natural');
      expect(isNaturalCard(id)).toBe(true);
    }
  });

  it('a sign card sits where its letter sits; its sound is one semitone away', () => {
    expect(cardPosition('treble-F#4')).toBe(cardPosition('treble-F4'));
    expect(cardPosition('bass-Bb2')).toBe(cardPosition('bass-B2'));
    expect(cardMidi('treble-F#4')).toBe(66);
    expect(cardMidi('treble-Bb4')).toBe(70);
    expect(cardMidi('bass-Ab2')).toBe(44);
    expect(cardMidi('bass-C#3')).toBe(49);
    expect(cardMidi('treble-G4')).toBe(67);
    for (const id of SIGN_CARDS) {
      const c = parseCardId(id);
      if (c) expect(Math.abs(cardMidi(id) - cardMidi(cardId(c.clef, c.note)))).toBe(1);
    }
  });

  it('parseCardId accepts every natural card and round-trips with cardId', () => {
    for (const id of NATURAL_CARDS) {
      const parsed = parseCardId(id);
      expect(parsed).not.toBeNull();
      if (parsed) expect(cardId(parsed.clef, parsed.note)).toBe(id);
      expect(isCardId(id)).toBe(true);
    }
  });

  it.each([
    'treble-C2',
    'alto-C4',
    '__proto__',
    'constructor',
    'toString',
    '',
    'treble-c4',
    'bass-F5',
    'treble-A3 ',
  ])('parseCardId rejects %j', (s) => {
    expect(parseCardId(s)).toBeNull();
    expect(isCardId(s)).toBe(false);
  });

  it('isCardId rejects non-strings', () => {
    for (const v of [null, undefined, 4, {}, [], ['treble-C4']]) expect(isCardId(v)).toBe(false);
  });

  it('cardPosition matches the staff positions', () => {
    expect(cardPosition('treble-E4')).toBe(0);
    expect(cardPosition('treble-C4')).toBe(-2);
    expect(cardPosition('bass-C4')).toBe(10);
    expect(cardPosition('bass-G2')).toBe(0);
  });
});
