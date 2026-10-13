import { describe, expect, it } from 'vitest';
import { ALL_CARDS, cardId, cardPosition, isCardId, parseCardId } from './cards';

describe('cards', () => {
  it('has exactly 34 unique cards in the specified order', () => {
    expect(ALL_CARDS).toHaveLength(34);
    expect(new Set(ALL_CARDS).size).toBe(34);
    expect(ALL_CARDS).toEqual([
      ...'A3 B3 C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5 C6'.split(' ').map((n) => `treble-${n}`),
      ...'C2 D2 E2 F2 G2 A2 B2 C3 D3 E3 F3 G3 A3 B3 C4 D4 E4'.split(' ').map((n) => `bass-${n}`),
    ]);
  });

  it('parseCardId accepts every card and round-trips with cardId', () => {
    for (const id of ALL_CARDS) {
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
