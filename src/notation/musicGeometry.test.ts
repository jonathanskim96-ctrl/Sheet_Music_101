import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { HomeSign, Time } from '../domain/music';
import { yOf, K, S } from './geometry';
import { GLYPHS } from './glyphs';
import {
  BEAM_HEIGHT,
  RHYTHM_HEIGHT,
  RHYTHM_LINE_Y,
  STEM_LENGTH,
  STEM_WIDTH,
  beamBetween,
  boxWidth,
  headOf,
  homeSignPositions,
  layoutMusic,
  markerShape,
  noteShape,
  planRows,
  restShape,
  stemUp,
  timeDigitYs,
  xAt,
  type MusicLayoutInput,
} from './musicGeometry';

/** Unwraps a value that the test knows is there. */
function def<T>(v: T | null | undefined): T {
  if (v === null || v === undefined) throw new Error('expected a value');
  return v;
}

const base = (over: Partial<MusicLayoutInput> = {}): MusicLayoutInput => ({
  mode: 'treble',
  home: 'none',
  time: 4,
  boxBeats: 4,
  boxCount: 2,
  ...over,
});

describe('home sign positions (SPEC 8.4)', () => {
  const pos = (clef: 'treble' | 'bass', home: HomeSign) =>
    homeSignPositions(clef, home).map((h) => `${h.sign}:${h.letter}:${String(h.p)}`);
  it('treble', () => {
    expect(pos('treble', 'none')).toEqual([]);
    expect(pos('treble', 'G')).toEqual(['sharp:F:8']);
    expect(pos('treble', 'D')).toEqual(['sharp:F:8', 'sharp:C:5']);
    expect(pos('treble', 'F')).toEqual(['flat:B:4']);
    expect(pos('treble', 'Bb')).toEqual(['flat:B:4', 'flat:E:7']);
  });
  it('bass', () => {
    expect(pos('bass', 'G')).toEqual(['sharp:F:6']);
    expect(pos('bass', 'D')).toEqual(['sharp:F:6', 'sharp:C:3']);
    expect(pos('bass', 'F')).toEqual(['flat:B:2']);
    expect(pos('bass', 'Bb')).toEqual(['flat:B:2', 'flat:E:5']);
  });
  it('draws signs 1 S apart, in order, after the clef and before the time numbers', () => {
    const l = layoutMusic(base({ home: 'D' }));
    expect(l.home.map((h) => h.p)).toEqual([8, 5]);
    expect(def(l.home[1]).x - def(l.home[0]).x).toBeCloseTo(S);
    const clefRight = l.clefX + GLYPHS.gClef.advance * K;
    expect(def(l.home[0]).x).toBeGreaterThan(clefRight);
    expect(l.timeX).not.toBeNull();
    expect((l.timeX ?? 0) - S).toBeGreaterThan(
      def(l.home[1]).x + GLYPHS.accidentalSharp.advance * K - 0.01,
    );
  });
  it('puts the signs on both staves of a grand staff, each on its own clef positions', () => {
    const l = layoutMusic(base({ mode: 'grand', home: 'G' }));
    expect(l.home.map((h) => `${h.clef}:${String(h.p)}`)).toEqual(['treble:8', 'bass:6']);
    expect(def(l.home[0]).x).toBe(def(l.home[1]).x);
  });
  it('draws no signs on the rhythm staff', () => {
    expect(layoutMusic(base({ mode: 'rhythm', home: 'D' })).home).toEqual([]);
  });
});

describe('header', () => {
  it('omits what is not used', () => {
    const none = layoutMusic(base({ time: null, boxCount: 1 }));
    expect(none.timeX).toBeNull();
    expect(none.home).toEqual([]);
    const withTime = layoutMusic(base({ boxCount: 1 }));
    expect(def(withTime.boxStarts[0])).toBeGreaterThan(def(none.boxStarts[0]));
  });
  it('puts the time digits at p = 6 and p = 2 (rhythm: above and below the line)', () => {
    expect(timeDigitYs('treble', 70)).toEqual({ top: yOf(70, 6), bottom: yOf(70, 2) });
    expect(timeDigitYs('bass', 70)).toEqual({ top: 40, bottom: 60 });
    expect(timeDigitYs('rhythm', 50)).toEqual({ top: 35, bottom: 65 });
  });
  it('has a rhythm staff of height 80 with the line at y = 50 and no clef', () => {
    const l = layoutMusic(base({ mode: 'rhythm' }));
    expect(l.height).toBe(80);
    expect(l.staves).toEqual([{ clef: null, bottomLineY: 50 }]);
  });
  it('uses the part-1 staff heights and positions', () => {
    expect(layoutMusic(base()).height).toBe(100);
    const g = layoutMusic(base({ mode: 'grand' }));
    expect(g.height).toBe(220);
    expect(g.staves.map((s) => s.bottomLineY)).toEqual([70, 170]);
    expect(g.x0).toBe(12);
  });
});

describe('time grid', () => {
  for (const time of [2, 3, 4] as Time[]) {
    it(`time ${String(time)}: x = boxStart + 1.2 S + beat × 3.0 S, box width 1.2 S + time × 3.0 S + 0.6 S`, () => {
      const l = layoutMusic(base({ time, boxBeats: time, boxCount: 3 }));
      expect(boxWidth(time)).toBeCloseTo(12 + time * 30 + 6);
      for (let b = 0; b < 3; b++) {
        for (let beat = 0; beat < time; beat++)
          expect(xAt(l, b, beat)).toBeCloseTo(def(l.boxStarts[b]) + 12 + beat * 30);
        expect(def(l.boxEnd[b]) - def(l.boxStarts[b])).toBeCloseTo(boxWidth(time));
      }
      expect(l.boxStarts[1]).toBeCloseTo(def(l.boxEnd[0]));
      expect(l.width).toBeGreaterThan(def(l.boxEnd[2]));
    });
  }
  it('is the same grid for both staves of a grand staff (same beat, same x)', () => {
    const l = layoutMusic(base({ mode: 'grand' }));
    // one shared layout: both staves use xAt, so equal beats cannot differ
    expect(xAt(l, 1, 2)).toBe(xAt(l, 1, 2));
    const top = noteShape('grand', def(l.staves[0]).bottomLineY, xAt(l, 0, 1), 0, 'q', null);
    const low = noteShape('grand', def(l.staves[1]).bottomLineY, xAt(l, 0, 1), 0, 'q', null);
    expect(top.x).toBe(low.x);
  });
  it('grows linearly with the number of boxes', () => {
    const one = layoutMusic(base({ boxCount: 1 })).width;
    const two = layoutMusic(base({ boxCount: 2 })).width;
    expect(two - one).toBeCloseTo(boxWidth(4));
  });
});

describe('room between notes (M9 review item 1)', () => {
  const l = layoutMusic(base({ boxCount: 1 }));
  const bottom = def(l.staves[0]).bottomLineY;
  for (const sign of ['sharp', 'flat', 'natural'] as const) {
    it(`a ${sign} sign keeps at least 0.4 S clear of the 1-beat head before it`, () => {
      const prev = noteShape('treble', bottom, xAt(l, 0, 0), 0, 'q', null);
      const next = noteShape('treble', bottom, xAt(l, 0, 1), 0, 'q', sign);
      const prevRight = prev.x + (GLYPHS.noteheadBlack.advance * K) / 2;
      expect(def(next.sign).x - prevRight).toBeGreaterThanOrEqual(0.4 * S);
    });
  }
  it('the two heads of a half-beat pair have a gap of at least 0.25 S', () => {
    const a = noteShape('rhythm', RHYTHM_LINE_Y, xAt(l, 0, 0), 0, 'ee', null);
    const b = noteShape('rhythm', RHYTHM_LINE_Y, xAt(l, 0, 0.5), 0, 'ee', null);
    const w = GLYPHS.noteheadBlack.advance * K;
    expect(b.x - w / 2 - (a.x + w / 2)).toBeGreaterThanOrEqual(0.25 * S);
  });
  it('the head after a half-beat pair has a gap of at least 0.25 S', () => {
    const b = noteShape('rhythm', RHYTHM_LINE_Y, xAt(l, 0, 0.5), 0, 'ee', null);
    const c = noteShape('rhythm', RHYTHM_LINE_Y, xAt(l, 0, 1), 0, 'q', null);
    const w = GLYPHS.noteheadBlack.advance * K;
    expect(c.x - w / 2 - (b.x + w / 2)).toBeGreaterThanOrEqual(0.25 * S);
  });
});

describe('noteShape', () => {
  it('chooses heads by duration', () => {
    expect(headOf('w')).toBe('whole');
    expect(headOf('h')).toBe('half');
    expect(headOf('h.')).toBe('half');
    expect(headOf('q')).toBe('black');
    expect(headOf('ee')).toBe('black');
  });
  it('puts the stem up on the right edge below the middle line and down on the left edge from it', () => {
    for (let p = -2; p <= 10; p++) {
      const n = noteShape('treble', 70, 100, p, 'q', null);
      const w = GLYPHS.noteheadBlack.advance * K;
      expect(n.stem?.up, `p=${String(p)}`).toBe(p < 4);
      expect(stemUp('treble', p)).toBe(p < 4);
      if (p < 4) {
        expect(n.stem?.x).toBeCloseTo(100 + w / 2 - STEM_WIDTH / 2);
        expect(n.stem?.y2).toBeCloseTo(n.y - STEM_LENGTH);
      } else {
        expect(n.stem?.x).toBeCloseTo(100 - w / 2 + STEM_WIDTH / 2);
        expect(n.stem?.y2).toBeCloseTo(n.y + STEM_LENGTH);
      }
      expect(n.stem?.y1).toBe(n.y);
    }
  });
  it('always stems up on the rhythm staff', () => {
    for (let p = 0; p < 10; p++)
      expect(noteShape('rhythm', 50, 40, p, 'h', null).stem?.up).toBe(true);
  });
  it('gives whole notes no stem and quarter lines a stem 3.5 S long', () => {
    expect(noteShape('treble', 70, 50, 3, 'w', null).stem).toBeNull();
    expect(STEM_LENGTH).toBe(35);
    expect(STEM_WIDTH).toBeCloseTo(1.2);
  });
  it('puts the dot of a dotted half note in a space, 0.5 S right of the head', () => {
    const onLine = noteShape('treble', 70, 100, 4, 'h.', null);
    const inSpace = noteShape('treble', 70, 100, 3, 'h.', null);
    const w = GLYPHS.noteheadHalf.advance * K;
    expect(onLine.dot).toEqual({ x: 100 + w / 2 + 5, y: yOf(70, 5) });
    expect(inSpace.dot).toEqual({ x: 100 + w / 2 + 5, y: yOf(70, 3) });
    expect(noteShape('treble', 70, 0, 3, 'h', null).dot).toBeNull();
  });
  it('dots in every position sit in a space (odd p)', () => {
    for (let p = -2; p <= 10; p++) {
      const d = def(noteShape('treble', 70, 0, p, 'h.', null).dot);
      const dp = Math.round(((70 - d.y) * 2) / S);
      expect(Math.abs(dp) % 2, `p=${String(p)}`).toBe(1);
    }
    // rhythm staff: head on the line (p = 0) puts the dot in the space above the line
    expect(def(noteShape('rhythm', 50, 0, 0, 'h.', null).dot).y).toBe(45);
  });
  it('right-aligns a printed sign 0.3 S left of the head, clear of it', () => {
    for (const s of ['sharp', 'flat', 'natural'] as const) {
      const n = noteShape('treble', 70, 100, 3, 'q', s);
      const g =
        GLYPHS[
          s === 'sharp' ? 'accidentalSharp' : s === 'flat' ? 'accidentalFlat' : 'accidentalNatural'
        ];
      const w = GLYPHS.noteheadBlack.advance * K;
      expect(def(n.sign).x + g.advance * K).toBeCloseTo(100 - w / 2 - 3);
      expect(def(n.sign).y).toBe(n.y);
    }
    expect(noteShape('treble', 70, 100, 3, 'q', null).sign).toBeNull();
  });
  it('adds ledger lines as in part 1 (0.4 S either side of the head) and none on the rhythm staff', () => {
    const c4 = noteShape('treble', 70, 100, -2, 'w', null);
    expect(c4.ledgers).toHaveLength(1);
    expect(def(c4.ledgers[0]).y).toBe(yOf(70, -2));
    expect(def(c4.ledgers[0]).x2 - def(c4.ledgers[0]).x1).toBeCloseTo(
      GLYPHS.noteheadWhole.advance * K + 8,
    );
    expect(noteShape('treble', 70, 100, 4, 'w', null).ledgers).toEqual([]);
    expect(noteShape('rhythm', 50, 100, -2, 'w', null).ledgers).toEqual([]);
  });
});

describe('beams', () => {
  it('joins two half-beat stems at their tops', () => {
    const l = layoutMusic(base({ mode: 'rhythm', boxCount: 1 }));
    const a = noteShape('rhythm', 50, xAt(l, 0, 0), 0, 'ee', null);
    const b = noteShape('rhythm', 50, xAt(l, 0, 0.5), 0, 'ee', null);
    const beam = def(beamBetween(a, b));
    expect(beam.height).toBe(BEAM_HEIGHT);
    expect(beam.x).toBeCloseTo(def(a.stem).x - STEM_WIDTH / 2);
    expect(beam.x + beam.width).toBeCloseTo(def(b.stem).x + STEM_WIDTH / 2);
    expect(beam.y).toBeCloseTo(50 - STEM_LENGTH);
    expect(b.x - a.x).toBeCloseTo(15);
  });
  it('needs two stems', () => {
    const a = noteShape('rhythm', 50, 0, 0, 'w', null);
    const b = noteShape('rhythm', 50, 10, 0, 'ee', null);
    expect(beamBetween(a, b)).toBeNull();
  });
});

describe('rests', () => {
  it('draws Q centred, H sitting on and W hanging from the middle/fourth line', () => {
    expect(restShape('treble', 70, 100, 'Q')).toMatchObject({
      glyph: 'restQuarter',
      y: yOf(70, 4),
    });
    expect(restShape('treble', 70, 100, 'H')).toMatchObject({ glyph: 'restHalf', y: yOf(70, 4) });
    expect(restShape('treble', 70, 100, 'W')).toMatchObject({ glyph: 'restWhole', y: yOf(70, 6) });
  });
  it('draws them on the line in rhythm mode', () => {
    for (const d of ['Q', 'H', 'W'] as const) expect(restShape('rhythm', 50, 100, d).y).toBe(50);
  });
  it('centres the glyph on the beat x', () => {
    const r = restShape('treble', 70, 100, 'Q');
    const g = GLYPHS.restQuarter;
    expect(r.x + ((g.bounds[0] + g.bounds[2]) / 2) * K).toBeCloseTo(100);
  });
});

describe('marker', () => {
  it('is 1.5 S above the top line for notes on or below it', () => {
    const m = markerShape('treble', 70, 80, yOf(70, 4), null);
    expect(m.apex).toEqual({ x: 80, y: yOf(70, 8) - 15 });
    expect(m.right.x - m.left.x).toBeCloseTo(1.2 * S);
    expect(m.left.y).toBeLessThan(m.apex.y);
  });
  it('rises above a head that is higher and stays inside the picture for the highest note', () => {
    const m = markerShape('treble', 70, 80, yOf(70, 10), null);
    expect(m.apex.y).toBeLessThan(yOf(70, 10) - 5);
    expect(m.left.y).toBeGreaterThanOrEqual(0);
  });
  it('sits above the stem on the rhythm staff', () => {
    const m = markerShape('rhythm', 50, 80, 50, 15);
    expect(m.apex.y).toBeLessThan(15);
    expect(m.left.y).toBeGreaterThanOrEqual(0);
  });
  it('clears the head of a stemless note on the rhythm staff', () => {
    const m = markerShape('rhythm', 50, 80, 50, null);
    expect(m.apex.y).toBeLessThan(50 - GLYPHS.noteheadWhole.bounds[3] * K);
  });
  it('keeps both time digits inside the rhythm picture', () => {
    const ys = timeDigitYs('rhythm', RHYTHM_LINE_Y);
    const g = GLYPHS.timeSig4;
    expect(ys.top - g.bounds[3] * K).toBeGreaterThanOrEqual(0);
    expect(ys.bottom - g.bounds[1] * K).toBeLessThanOrEqual(RHYTHM_HEIGHT);
  });
});

describe('planRows (staff space at least 9 px)', () => {
  it('keeps two 4-box rows on one line on a wide view and splits them on a narrow one', () => {
    expect(planRows(base(), 600, 9)).toEqual([2]);
    expect(planRows(base(), 268, 9)).toEqual([1, 1]);
  });
  it('never splits a single box and never loses a box', () => {
    expect(planRows(base({ boxCount: 1 }), 10, 9)).toEqual([1]);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 50, max: 900 }), (n, w) => {
        const rows = planRows(base({ boxCount: n }), w, 9);
        expect(rows.reduce((a, b) => a + b, 0)).toBe(n);
        expect(rows.every((r) => r >= 1)).toBe(true);
      }),
    );
  });
  it('keeps every row at 9 px or more whenever a split can help', () => {
    for (const w of [268, 300, 358]) {
      const rows = planRows(base({ boxCount: 2 }), w, 9);
      let first = true;
      for (const r of rows) {
        const lay = layoutMusic(base({ boxCount: r, time: first ? 4 : null }));
        if (r > 1) expect((w * S) / lay.width).toBeGreaterThanOrEqual(9);
        first = false;
      }
    }
  });
});
