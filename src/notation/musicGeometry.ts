import type { Dur, HomeSign, RestDur, Time } from '../domain/music';
import { HOME_SIGN_LETTERS } from '../domain/music';
import type { Clef, Letter, Sign } from '../domain/notes';
import { GLYPHS } from './glyphs';
import { K, S, ledgerPositions, yOf } from './geometry';

// Pure geometry for drawing music in boxes (SPEC 8.4). Everything is in SVG units, S = one
// staff space. The component (Music.tsx) only turns these numbers into elements.

export type MusicMode = 'treble' | 'bass' | 'grand' | 'rhythm';

export const STAFF_HEIGHT = 100;
export const GRAND_HEIGHT = 220;
/** 80, not the 70 of SPEC 8.4 as first written: a bottom time digit 1.5 S below the line needs it. */
export const RHYTHM_HEIGHT = 80;
/** The single line of the rhythm staff. */
export const RHYTHM_LINE_Y = 50;
const SINGLE_BOTTOM = 70;
const GRAND_BASS_BOTTOM = SINGLE_BOTTOM + 10 * S;

export const STEM_LENGTH = 3.5 * S;
export const STEM_WIDTH = 0.12 * S;
export const BEAM_HEIGHT = 0.5 * S;
export const BAR_WIDTH = 0.13 * S;
/** Space before the first beat of a box, per beat, and after the last beat. */
const BOX_LEAD = 1.2 * S;
const BEAT_WIDTH = 3.0 * S;
const BOX_TAIL = 0.6 * S;
const HEAD_GAP = 0.3 * S;
export const EMPTY_SLOT = { width: 2 * S, height: 4 * S } as const;

const HEAD_WIDTH = {
  whole: GLYPHS.noteheadWhole.advance * K,
  half: GLYPHS.noteheadHalf.advance * K,
  black: GLYPHS.noteheadBlack.advance * K,
} as const;
export type HeadKind = keyof typeof HEAD_WIDTH;

/** Which head a duration uses. */
export function headOf(dur: Dur): HeadKind {
  if (dur === 'w') return 'whole';
  if (dur === 'h' || dur === 'h.') return 'half';
  return 'black';
}

/** Width of a notehead in SVG units. */
export function headWidth(kind: HeadKind): number {
  return HEAD_WIDTH[kind];
}

// ---- header ----------------------------------------------------------------------------

const HOME_POSITIONS: Record<Clef, Record<Letter, number | undefined>> = {
  treble: { F: 8, C: 5, B: 4, E: 7, A: undefined, D: undefined, G: undefined },
  bass: { F: 6, C: 3, B: 2, E: 5, A: undefined, D: undefined, G: undefined },
};

export interface HomeSignSpot {
  clef: Clef;
  sign: Sign;
  letter: Letter;
  /** Staff position of the sign. */
  p: number;
  /** Left edge of the glyph. */
  x: number;
}

/** Where the home signs go on a clef: staff position per sign, in drawing order (SPEC 8.4). */
export function homeSignPositions(
  clef: Clef,
  home: HomeSign,
): { sign: Sign; letter: Letter; p: number }[] {
  return HOME_SIGN_LETTERS[home].map(({ letter, sign }) => {
    const p = HOME_POSITIONS[clef][letter];
    if (p === undefined) throw new Error(`No home-sign position for ${letter} on the ${clef} clef`);
    return { sign, letter, p };
  });
}

const CLEF_ADVANCE = Math.max(GLYPHS.gClef.advance, GLYPHS.fClef.advance) * K;
const TIME_DIGIT_WIDTH = 2 * S;

export interface MusicLayoutInput {
  mode: MusicMode;
  home: HomeSign;
  /** Beats per box, drawn as time numbers; null = no time numbers (a lone note, later rows). */
  time: Time | null;
  /** The length of every box in beats (decides the box width). */
  boxBeats: Time;
  boxCount: number;
}

export interface StaveSpot {
  clef: Clef | null;
  bottomLineY: number;
}

export interface MusicLayout {
  mode: MusicMode;
  width: number;
  height: number;
  /** Where the staff lines start (the system line on a grand staff). */
  x0: number;
  clefX: number;
  staves: StaveSpot[];
  home: HomeSignSpot[];
  /** Centre x of the time digits, or null when none are drawn. */
  timeX: number | null;
  boxStarts: number[];
  boxEnd: number[];
  boxBeats: Time;
}

/** Width of one box in SVG units. */
export function boxWidth(beats: number): number {
  return BOX_LEAD + beats * BEAT_WIDTH + BOX_TAIL;
}

/** Centre x of a note at `beat` of a box (SPEC 8.4 time grid). */
export function xAt(layout: Pick<MusicLayout, 'boxStarts'>, box: number, beat: number): number {
  return (layout.boxStarts[box] ?? 0) + BOX_LEAD + beat * BEAT_WIDTH;
}

/** Lays out the header, the boxes and the staves. */
export function layoutMusic(input: MusicLayoutInput): MusicLayout {
  const { mode, home, time, boxBeats, boxCount } = input;
  const rhythm = mode === 'rhythm';
  const grand = mode === 'grand';
  const x0 = grand ? 1.2 * S : 0;
  const clefX = x0 + 0.5 * S;
  let cursor = rhythm ? 0.5 * S : clefX + CLEF_ADVANCE;
  const homeSpots: HomeSignSpot[] = [];
  if (!rhythm && home !== 'none') {
    cursor += 0.8 * S;
    const clefs: Clef[] = grand ? ['treble', 'bass'] : [mode];
    for (const clef of clefs)
      homeSignPositions(clef, home).forEach((spot, i) => {
        homeSpots.push({ ...spot, clef, x: cursor + i * S });
      });
    const signs = HOME_SIGN_LETTERS[home];
    cursor += signs.length * S;
  }
  let timeX: number | null = null;
  if (time !== null) {
    cursor += 0.5 * S;
    timeX = cursor + TIME_DIGIT_WIDTH / 2;
    cursor += TIME_DIGIT_WIDTH;
  }
  const first = cursor + 1.0 * S;
  const boxStarts: number[] = [];
  const boxEnd: number[] = [];
  let at = first;
  for (let i = 0; i < boxCount; i++) {
    boxStarts.push(at);
    at += boxWidth(boxBeats);
    boxEnd.push(at);
  }
  const staves: StaveSpot[] = grand
    ? [
        { clef: 'treble', bottomLineY: SINGLE_BOTTOM },
        { clef: 'bass', bottomLineY: GRAND_BASS_BOTTOM },
      ]
    : rhythm
      ? [{ clef: null, bottomLineY: RHYTHM_LINE_Y }]
      : [{ clef: mode, bottomLineY: SINGLE_BOTTOM }];
  return {
    mode,
    width: at + 0.3 * S,
    height: grand ? GRAND_HEIGHT : rhythm ? RHYTHM_HEIGHT : STAFF_HEIGHT,
    x0,
    clefX,
    staves,
    home: homeSpots,
    timeX,
    boxStarts,
    boxEnd,
    boxBeats,
  };
}

/** Y of the time digit centres on a stave: top digit at p = 6, bottom at p = 2 (rhythm: 1.5 S above / below the line). */
export function timeDigitYs(mode: MusicMode, bottomLineY: number): { top: number; bottom: number } {
  if (mode === 'rhythm') return { top: bottomLineY - 1.5 * S, bottom: bottomLineY + 1.5 * S };
  return { top: yOf(bottomLineY, 6), bottom: yOf(bottomLineY, 2) };
}

/**
 * Splits boxes over rows so each row keeps a staff space of at least `minSpacePx` CSS pixels
 * when the music is `widthPx` wide (SPEC 8.4). Only the first row shows the time numbers. A
 * single box is never split, whatever its size.
 */
export function planRows(input: MusicLayoutInput, widthPx: number, minSpacePx: number): number[] {
  const rows: number[] = [];
  let left = input.boxCount;
  let firstRow = true;
  while (left > 0) {
    const time = firstRow ? input.time : null;
    let take = left;
    while (take > 1) {
      const w = layoutMusic({ ...input, time, boxCount: take }).width;
      if ((widthPx * S) / w >= minSpacePx) break;
      take -= 1;
    }
    rows.push(take);
    left -= take;
    firstRow = false;
  }
  return rows;
}

// ---- notes -----------------------------------------------------------------------------

export interface NoteShape {
  head: HeadKind;
  x: number;
  y: number;
  p: number;
  stem: { x: number; y1: number; y2: number; up: boolean } | null;
  dot: { x: number; y: number } | null;
  sign: { sign: Sign; x: number; y: number } | null;
  ledgers: { y: number; x1: number; x2: number }[];
}

/** Stem direction rule: below the middle line up, from the middle line on down; rhythm always up. */
export function stemUp(mode: MusicMode, p: number): boolean {
  return mode === 'rhythm' || p < 4;
}

/** Everything needed to draw one note: head, stem, dot, printed sign and ledger lines. */
export function noteShape(
  mode: MusicMode,
  bottomLineY: number,
  x: number,
  p: number,
  dur: Dur,
  printed: Sign | null,
): NoteShape {
  const head = headOf(dur);
  const w = HEAD_WIDTH[head];
  const y = yOf(bottomLineY, p);
  let stem: NoteShape['stem'] = null;
  if (dur !== 'w') {
    const up = stemUp(mode, p);
    // Stems sit on the head's right edge going up and its left edge going down.
    const sx = up ? x + w / 2 - STEM_WIDTH / 2 : x - w / 2 + STEM_WIDTH / 2;
    stem = { x: sx, y1: y, y2: up ? y - STEM_LENGTH : y + STEM_LENGTH, up };
  }
  let dot: NoteShape['dot'] = null;
  if (dur === 'h.') {
    // A dot belongs in a space: heads on a line (even p) put it in the space above.
    const dp = p % 2 === 0 ? p + 1 : p;
    dot = { x: x + w / 2 + 0.5 * S, y: yOf(bottomLineY, dp) };
  }
  let sign: NoteShape['sign'] = null;
  if (printed !== null) {
    const g = signGlyphName(printed);
    sign = { sign: printed, x: x - w / 2 - HEAD_GAP - GLYPHS[g].advance * K, y };
  }
  const ledgers =
    mode === 'rhythm'
      ? []
      : ledgerPositions(p).map((q) => ({
          y: yOf(bottomLineY, q),
          x1: x - (w + 0.8 * S) / 2,
          x2: x + (w + 0.8 * S) / 2,
        }));
  return { head, x, y, p, stem, dot, sign, ledgers };
}

/** The Bravura glyph name for a printed sign. */
export function signGlyphName(s: Sign): 'accidentalSharp' | 'accidentalFlat' | 'accidentalNatural' {
  return s === 'sharp' ? 'accidentalSharp' : s === 'flat' ? 'accidentalFlat' : 'accidentalNatural';
}

/** The beam joining two half-beat notes: from the first stem's left edge to the second's right edge. */
export function beamBetween(
  a: NoteShape,
  b: NoteShape,
): { x: number; y: number; width: number; height: number } | null {
  if (!a.stem || !b.stem) return null;
  const x = a.stem.x - STEM_WIDTH / 2;
  const right = b.stem.x + STEM_WIDTH / 2;
  // The beam hangs from the stem tops, so it ends level with them.
  return { x, y: Math.min(a.stem.y2, b.stem.y2), width: right - x, height: BEAM_HEIGHT };
}

export interface RestShape {
  glyph: 'restQuarter' | 'restHalf' | 'restWhole';
  /** Glyph origin in SVG units; x is the left edge of the glyph's bounding box. */
  x: number;
  y: number;
}

/** Where a rest is drawn: Q centred, H sitting on, W hanging from a line (SPEC 8.4). */
export function restShape(
  mode: MusicMode,
  bottomLineY: number,
  x: number,
  dur: RestDur,
): RestShape {
  const glyph = dur === 'Q' ? 'restQuarter' : dur === 'H' ? 'restHalf' : 'restWhole';
  const g = GLYPHS[glyph];
  const left = x - ((g.bounds[0] + g.bounds[2]) / 2) * K;
  if (mode === 'rhythm') return { glyph, x: left, y: bottomLineY };
  // staff: Q on the middle line (p = 4), H sitting on it, W hanging from line 4 (p = 6)
  return { glyph, x: left, y: yOf(bottomLineY, dur === 'W' ? 6 : 4) };
}

/** The marker triangle's apex (downward point) and corners for a marked note (SPEC 8.4). */
export function markerShape(
  mode: MusicMode,
  bottomLineY: number,
  x: number,
  headY: number,
  stemTop: number | null,
): {
  apex: { x: number; y: number };
  left: { x: number; y: number };
  right: { x: number; y: number };
} {
  const topLine = yOf(bottomLineY, 8);
  let apexY: number;
  // A stemless head (a whole note) is 1 S tall, so its marker starts a full S above its centre.
  if (mode === 'rhythm') apexY = stemTop === null ? headY - S : stemTop - 0.3 * S;
  else apexY = Math.min(topLine - 1.5 * S, headY - S);
  return {
    apex: { x, y: apexY },
    left: { x: x - 0.6 * S, y: apexY - 1.0 * S },
    right: { x: x + 0.6 * S, y: apexY - 1.0 * S },
  };
}
