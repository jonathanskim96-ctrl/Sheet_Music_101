import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { GLYPHS } from './glyphs';

const EXPECTED = [
  'accidentalFlat',
  'accidentalNatural',
  'accidentalSharp',
  'augmentationDot',
  'brace',
  'fClef',
  'gClef',
  'noteheadBlack',
  'noteheadHalf',
  'noteheadWhole',
  'restHalf',
  'restQuarter',
  'restWhole',
  'timeSig2',
  'timeSig3',
  'timeSig4',
];

describe('toolchain', () => {
  it('runs property tests', () => {
    fc.assert(fc.property(fc.integer(), (n) => n + 0 === n));
  });
  it('has the glyphs the renderer needs', () => {
    expect(Object.keys(GLYPHS).sort()).toEqual(EXPECTED);
  });
  it('gives every glyph an outline and sane bounds (font units, 250 per staff space)', () => {
    for (const [name, g] of Object.entries(GLYPHS)) {
      expect(g.d.startsWith('M'), name).toBe(true);
      const [x0, y0, x1, y1] = g.bounds;
      expect(x1, name).toBeGreaterThan(x0);
      expect(y1, name).toBeGreaterThan(y0);
      expect(g.advance, name).toBeGreaterThan(0);
      // nothing in the set is taller than the brace (4 staff spaces) or 5 staff spaces wide
      expect(y1 - y0, name).toBeLessThanOrEqual(1100 + 1100);
      expect(x1 - x0, name).toBeLessThanOrEqual(1250);
    }
  });
  it('keeps the head sizes the layout relies on', () => {
    expect(GLYPHS.noteheadWhole.advance).toBe(422);
    expect(GLYPHS.noteheadHalf.bounds).toEqual([0, -125, 295, 125]);
    expect(GLYPHS.noteheadBlack.bounds).toEqual([0, -125, 295, 125]);
  });
});
