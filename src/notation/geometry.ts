import { GLYPHS } from './glyphs';
import type { Clef } from '../domain/notes';

/** Staff space in SVG units (SPEC 7.3). */
export const S = 10;
/** Glyph scale: glyph units are 1/250 of a staff space. */
export const K = S / 250;
/** Width of a whole notehead. */
export const NOTE_WIDTH = GLYPHS.noteheadWhole.advance * K;
/** Ledger lines extend 0.4 S beyond each side of the notehead. */
export const LEDGER_LENGTH = NOTE_WIDTH + 0.8 * S;
export const LINE_WIDTH = 0.13 * S;
export const LEDGER_WIDTH = 0.16 * S;
/** Scale of the brace glyph: 1000 units at K is 4 S tall, the grand staff needs 14 S. */
export const BRACE_SCALE = K * 3.5;
export const SINGLE_HEIGHT = 100;
export const GRAND_HEIGHT = 220;
const SINGLE_BOTTOM = 70;
/** Bottom line of the bass staff on the grand staff: 6 S gap + 4 S of staff below the treble. */
const GRAND_BASS_BOTTOM = SINGLE_BOTTOM + 10 * S;
/** Staff positions that get an invisible tap band (SPEC 7.3). */
export const TAP_POSITIONS: readonly number[] = Array.from({ length: 17 }, (_, i) => i - 4);

export type StaffMode = 'treble' | 'bass' | 'grand' | 'none';

/** Y coordinate of staff position p (0 = bottom line, +1 per half space). */
export function yOf(bottomLineY: number, p: number): number {
  return bottomLineY - (p * S) / 2;
}

/** The even staff positions that need a ledger line for a note at p (SPEC 7.3). */
export function ledgerPositions(p: number): number[] {
  const out: number[] = [];
  if (p <= -2) for (let q = -2; q >= p; q -= 2) out.push(q);
  else if (p >= 10) for (let q = 10; q <= p; q += 2) out.push(q);
  return out;
}

export interface StaveLayout {
  /** null on the clefless unit-1 staff. */
  clef: Clef | null;
  bottomLineY: number;
}

export interface StaffLayout {
  width: number;
  height: number;
  /** Where the staff lines start: 0 on a single staff, the system line on a grand staff. */
  x0: number;
  clefX: number;
  staves: StaveLayout[];
  /** One x per note, in the order the notes were given. */
  noteXs: number[];
}

/** The widest clef advance, so notes never touch a clef whichever one is drawn. */
const CLEF_ADVANCE = Math.max(GLYPHS.gClef.advance, GLYPHS.fClef.advance) * K;

/**
 * Layout of a staff for `noteCount` notes. One and two notes use the spec's fixed
 * positions; three or more are spaced 3.5 S apart (not specified, used by the gallery).
 */
export function layoutStaff(mode: StaffMode, noteCount: number): StaffLayout {
  const grand = mode === 'grand';
  const x0 = grand ? 1.2 * S : 0;
  const clefX = x0 + 0.5 * S;
  const areaStart = mode === 'none' ? clefX + 1.5 * S : clefX + CLEF_ADVANCE + 1.5 * S;
  let width = noteCount <= 1 ? 140 : 160;
  let noteXs: number[];
  if (noteCount <= 0) noteXs = [];
  else if (noteCount === 1) noteXs = [0.62 * width];
  else if (noteCount === 2) noteXs = [0.5 * width, 0.78 * width];
  else {
    noteXs = Array.from({ length: noteCount }, (_, i) => areaStart + S + i * 3.5 * S);
    width = (noteXs[noteCount - 1] ?? 0) + 2 * S;
  }
  const staves: StaveLayout[] =
    mode === 'grand'
      ? [
          { clef: 'treble', bottomLineY: SINGLE_BOTTOM },
          { clef: 'bass', bottomLineY: GRAND_BASS_BOTTOM },
        ]
      : [{ clef: mode === 'none' ? null : mode, bottomLineY: SINGLE_BOTTOM }];
  return { width, height: grand ? GRAND_HEIGHT : SINGLE_HEIGHT, x0, clefX, staves, noteXs };
}

/** The stave that draws notes of `clef` in this layout. */
export function staveFor(layout: StaffLayout, clef: Clef): StaveLayout {
  return (
    layout.staves.find((s) => s.clef === clef) ??
    layout.staves[0] ?? { clef, bottomLineY: SINGLE_BOTTOM }
  );
}

/** Y of the clef glyph origin: the G line (p = 2) or the F line (p = 6). */
export function clefOriginY(stave: StaveLayout): number {
  return yOf(stave.bottomLineY, stave.clef === 'bass' ? 6 : 2);
}

/** Nearest tap position (-4..12) for a y coordinate on a stave. */
export function positionAtY(bottomLineY: number, y: number): number {
  const p = Math.round(((bottomLineY - y) * 2) / S);
  return Math.min(12, Math.max(-4, p));
}
