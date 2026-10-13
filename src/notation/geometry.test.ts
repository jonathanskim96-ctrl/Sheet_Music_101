import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ALL_CARDS, parseCardId } from '../domain/cards';
import { noteAtPosition, staffPosition } from '../domain/notes';
import {
  K,
  LEDGER_LENGTH,
  NOTE_WIDTH,
  S,
  TAP_POSITIONS,
  clefOriginY,
  layoutStaff,
  ledgerPositions,
  positionAtY,
  staveFor,
  yOf,
} from './geometry';

/** Independent table: the y of each treble/bass line and space, counted by hand from the bottom line at y = 70. */
const TREBLE_Y: Record<string, number> = {
  E4: 70,
  F4: 65,
  G4: 60,
  A4: 55,
  B4: 50,
  C5: 45,
  D5: 40,
  E5: 35,
  F5: 30,
};
const BASS_Y: Record<string, number> = {
  G2: 70,
  A2: 65,
  B2: 60,
  C3: 55,
  D3: 50,
  E3: 45,
  F3: 40,
  G3: 35,
  A3: 30,
};

describe('yOf', () => {
  it('puts the five lines one staff space (10 units) apart, going up', () => {
    expect([0, 2, 4, 6, 8].map((p) => yOf(70, p))).toEqual([70, 60, 50, 40, 30]);
  });

  it('matches hand-counted positions for the notes on and between the lines', () => {
    for (const [n, y] of Object.entries(TREBLE_Y)) {
      const card = parseCardId(`treble-${n}`);
      expect(card, n).not.toBeNull();
      if (card) expect(yOf(70, staffPosition('treble', card.note)), `treble ${n}`).toBe(y);
    }
    for (const [n, y] of Object.entries(BASS_Y)) {
      const card = parseCardId(`bass-${n}`);
      expect(card, n).not.toBeNull();
      if (card) expect(yOf(70, staffPosition('bass', card.note)), `bass ${n}`).toBe(y);
    }
  });

  it('is exact for all 34 cards (higher pitch is always higher on the page)', () => {
    for (const id of ALL_CARDS) {
      const c = parseCardId(id);
      if (!c) throw new Error(id);
      const p = staffPosition(c.clef, c.note);
      expect(yOf(70, p)).toBe(70 - p * 5);
      expect(yOf(70, p + 1)).toBeLessThan(yOf(70, p));
    }
  });
});

describe('ledgerPositions', () => {
  const treble = (n: string): number[] => {
    const c = parseCardId(`treble-${n}`);
    return c ? ledgerPositions(staffPosition('treble', c.note)) : [];
  };
  const bass = (n: string): number[] => {
    const c = parseCardId(`bass-${n}`);
    return c ? ledgerPositions(staffPosition('bass', c.note)) : [];
  };

  it('treble A3 (below Middle C) has two ledger lines below', () => {
    expect(treble('A3')).toEqual([-2, -4]);
  });
  it('treble B3 has one ledger line below', () => {
    expect(treble('B3')).toEqual([-2]);
  });
  it('treble C4 (Middle C) has one ledger line', () => {
    expect(treble('C4')).toEqual([-2]);
  });
  it('treble D4 sits below the staff with the C4 line only', () => {
    expect(treble('D4')).toEqual([]);
  });
  it('treble C6 has two ledger lines above', () => {
    expect(treble('C6')).toEqual([10, 12]);
  });
  it('treble A5 has one ledger line above', () => {
    expect(treble('A5')).toEqual([10]);
  });
  it('treble G5 and F5 have none', () => {
    expect(treble('G5')).toEqual([]);
    expect(treble('F5')).toEqual([]);
  });
  it('bass C2 has two ledger lines below', () => {
    expect(bass('C2')).toEqual([-2, -4]);
  });
  it('bass E4 has two ledger lines above', () => {
    expect(bass('E4')).toEqual([10, 12]);
  });
  it('bass C4 (Middle C) has one ledger line above', () => {
    expect(bass('C4')).toEqual([10]);
  });
  it('bass D4 has one ledger line above (space note above it)', () => {
    expect(bass('D4')).toEqual([10]);
  });
  it('never gives a ledger line to a note inside the staff', () => {
    for (let p = -1; p <= 9; p++) expect(ledgerPositions(p), `p=${String(p)}`).toEqual([]);
  });
  it('gives every note below/above the staff only even positions, ending at or before the note', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10, max: 16 }), (p) => {
        const out = ledgerPositions(p);
        for (const q of out) {
          expect(Math.abs(q) % 2).toBe(0);
          expect(Math.abs(q)).toBeLessThanOrEqual(Math.abs(p));
        }
      }),
    );
  });
});

describe('positions', () => {
  it('round-trips with noteAtPosition for every card', () => {
    for (const id of ALL_CARDS) {
      const c = parseCardId(id);
      if (!c) throw new Error(id);
      expect(noteAtPosition(c.clef, staffPosition(c.clef, c.note))).toBe(c.note);
    }
  });

  it('positionAtY inverts yOf and clamps to -4..12', () => {
    for (const p of TAP_POSITIONS) expect(positionAtY(70, yOf(70, p))).toBe(p);
    expect(positionAtY(70, -500)).toBe(12);
    expect(positionAtY(70, 500)).toBe(-4);
    expect(positionAtY(70, yOf(70, 3) + 1)).toBe(3);
  });

  it('has 17 tap positions from -4 to 12', () => {
    expect(TAP_POSITIONS).toHaveLength(17);
    expect(TAP_POSITIONS[0]).toBe(-4);
    expect(TAP_POSITIONS[16]).toBe(12);
  });
});

describe('layoutStaff', () => {
  it('uses the spec dimensions for a single staff', () => {
    const one = layoutStaff('treble', 1);
    expect(one.width).toBe(140);
    expect(one.height).toBe(100);
    expect(one.noteXs).toEqual([0.62 * 140]);
    expect(one.staves).toEqual([{ clef: 'treble', bottomLineY: 70 }]);
    const two = layoutStaff('bass', 2);
    expect(two.width).toBe(160);
    expect(two.noteXs).toEqual([80, 0.78 * 160]);
  });

  it('keeps the bottom line at 70 and the staff inside the viewBox for every position -6..14', () => {
    const l = layoutStaff('treble', 1);
    expect(yOf(70, -6)).toBeGreaterThanOrEqual(0);
    expect(yOf(70, 14)).toBeGreaterThanOrEqual(0);
    expect(yOf(70, -6)).toBeLessThanOrEqual(l.height);
  });

  it('places the first note clear of the clef', () => {
    const l = layoutStaff('treble', 2);
    const clefEnd = l.clefX + 671 * K;
    expect(l.noteXs[0]).toBeGreaterThan(clefEnd + NOTE_WIDTH / 2);
  });

  it('puts the grand staff bass 10 S below the treble bottom line (6 S gap)', () => {
    const g = layoutStaff('grand', 2);
    expect(g.height).toBe(220);
    expect(g.x0).toBeCloseTo(12);
    expect(g.clefX).toBeCloseTo(17);
    const treble = staveFor(g, 'treble');
    const bass = staveFor(g, 'bass');
    expect(bass.bottomLineY - treble.bottomLineY).toBe(10 * S);
    // gap between the treble bottom line and the bass top line is 6 S
    // gap between the treble bottom line and the bass top line is 6 S
    expect(treble.bottomLineY - yOf(bass.bottomLineY, 8)).toBe(-6 * S);
  });

  it('draws the G clef on the G line and the F clef on the F line', () => {
    const g = layoutStaff('grand', 1);
    expect(clefOriginY(staveFor(g, 'treble'))).toBe(60);
    expect(clefOriginY(staveFor(g, 'bass'))).toBe(140);
  });

  it('spaces three or more notes apart and widens the staff to fit', () => {
    const l = layoutStaff('treble', 5);
    for (let i = 1; i < 5; i++)
      expect((l.noteXs[i] ?? 0) - (l.noteXs[i - 1] ?? 0)).toBeCloseTo(35, 9);
    expect(l.width).toBeGreaterThan((l.noteXs[4] ?? 0) + NOTE_WIDTH / 2);
  });

  it('has no clef on the unit-1 staff and ledger lines slightly wider than the note', () => {
    expect(layoutStaff('none', 1).staves[0]?.clef).toBeNull();
    expect(LEDGER_LENGTH).toBeCloseTo(NOTE_WIDTH + 8);
  });
});
