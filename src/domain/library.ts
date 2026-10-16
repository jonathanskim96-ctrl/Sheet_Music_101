import { noteFromDiatonic, diatonicIndex, type Clef, type Note } from './notes';
import {
  parseMusic,
  parseRhythm,
  type HomeSign,
  type Melody,
  type MusicEvent,
  type RhythmToken,
  type Staffline,
  type Time,
} from './music';

// Material libraries of course part 2, transcribed from CURRICULUM §9. Everything is parsed
// when the module loads and a data test asserts that nothing failed to parse.

export type RhythmSet = 'RA' | 'RD' | 'RR' | 'RE';

export interface RhythmPattern {
  id: string;
  set: RhythmSet;
  time: Time;
  /** The pattern as written in CURRICULUM §9.1. */
  text: string;
  tokens: RhythmToken[];
}

const RHYTHM_TEXT: Record<RhythmSet, Record<Time, readonly string[]>> = {
  RA: {
    4: ['w', 'h h', 'q q h', 'h q q', 'q h q', 'q q q q'],
    3: [],
    2: [],
  },
  RD: {
    4: ['h. q', 'q h.'],
    3: ['h.', 'h q', 'q h', 'q q q'],
    2: ['h', 'q q'],
  },
  RR: {
    4: ['q Q q Q', 'h H', 'q q H', 'H h', 'W', 'Q q q q', 'q Q h'],
    3: ['h Q', 'Q q q', 'q Q q'],
    2: ['q Q', 'Q q'],
  },
  RE: {
    4: ['ee q q q', 'q ee q q', 'ee ee h', 'h ee q', 'ee ee ee ee', 'q q ee q'],
    3: ['ee q q', 'q ee q', 'h ee'],
    2: ['ee q', 'ee ee'],
  },
};

function buildPatterns(): RhythmPattern[] {
  const out: RhythmPattern[] = [];
  for (const set of ['RA', 'RD', 'RR', 'RE'] as const) {
    for (const time of [4, 3, 2] as const) {
      RHYTHM_TEXT[set][time].forEach((text, i) => {
        const tokens = parseRhythm(text);
        // A bad pattern is a data bug; fail loudly at start-up rather than draw nothing.
        if (tokens === null) throw new Error(`Bad rhythm pattern ${set}${String(time)}: ${text}`);
        out.push({ id: `${set}-${String(time)}-${String(i + 1)}`, set, time, text, tokens });
      });
    }
  }
  return out;
}

/** Every one-box rhythm pattern of CURRICULUM §9.1. */
export const RHYTHM_PATTERNS: readonly RhythmPattern[] = buildPatterns();

/** The patterns of one set (and one time, when given). */
export function rhythmPatterns(set: RhythmSet, time?: Time): readonly RhythmPattern[] {
  return RHYTHM_PATTERNS.filter((p) => p.set === set && (time === undefined || p.time === time));
}

/** Single events for beats-of and which-longer: each set adds to the one before it. */
export const EVENT_SETS: Record<RhythmSet, readonly RhythmToken[]> = {
  RA: ['q', 'h', 'w'],
  RD: ['q', 'h', 'w', 'h.'],
  RR: ['q', 'h', 'w', 'h.', 'Q', 'H', 'W'],
  RE: ['q', 'h', 'w', 'h.', 'Q', 'H', 'W', 'ee'],
};

function staffline(id: string, clef: Clef, text: string): Staffline {
  const boxes = parseMusic(clef, text);
  // A bad line is a data bug; fail loudly at start-up rather than draw nothing.
  if (boxes === null) throw new Error(`Bad music in ${id}: ${text}`);
  return { clef, boxes };
}

/** One tune on a single staff. */
function m(id: string, clef: Clef, time: Time, home: HomeSign, text: string): Melody {
  return { id, time, home, staffs: [staffline(id, clef, text)] };
}

/** A grand-staff tune: right hand on the treble staff, left hand on the bass staff. */
function grand(id: string, time: Time, treble: string, bass: string): Melody {
  return {
    id,
    time,
    home: 'none',
    staffs: [staffline(id, 'treble', treble), staffline(id, 'bass', bass)],
  };
}

/** Treble, no signs (MT). */
export const MT: readonly Melody[] = [
  m('t1', 'treble', 4, 'none', 'C4q D4q E4q F4q | G4h G4h'),
  m('t2', 'treble', 4, 'none', 'E4q D4q C4q D4q | E4q E4q E4h'),
  m('t3', 'treble', 4, 'none', 'G4q F4q E4q D4q | C4w'),
  m('t4', 'treble', 4, 'none', 'C4q E4q G4h | G4q E4q C4h'),
  m('t5', 'treble', 4, 'none', 'E4q F4q G4q E4q | D4h C4h'),
  m('t6', 'treble', 4, 'none', 'G4q A4q B4q C5q | C5w'),
  m('t7', 'treble', 4, 'none', 'C5q B4q A4q G4q | F4q E4q D4h'),
  m('t8', 'treble', 4, 'none', 'E4h G4h | F4q E4q D4h'),
  m('t9', 'treble', 3, 'none', 'C4h E4q | G4h.'),
  m('t10', 'treble', 3, 'none', 'G4q F4q E4q | D4h.'),
  m('t11', 'treble', 4, 'none', 'C4q E4q D4q F4q | E4q G4q C5h'),
  m('t12', 'treble', 4, 'none', 'G4q E4q F4q D4q | E4q C4q C4h'),
];
const pick = (list: readonly Melody[], ids: readonly string[]): readonly Melody[] =>
  ids.map((id) => {
    const hit = list.find((x) => x.id === id);
    if (!hit) throw new Error(`Unknown melody ${id}`);
    return hit;
  });
export const MT_STEP: readonly Melody[] = pick(MT, ['t1', 't2', 't3', 't5', 't7', 't10']);
export const MT_SKIP: readonly Melody[] = pick(MT, ['t4', 't6', 't8', 't9', 't11', 't12']);

/** Treble, a sign lasts the box (MS). */
export const MS: readonly Melody[] = [
  m('s1', 'treble', 4, 'none', 'F4q F#4q G4q F4q | E4w'),
  m('s2', 'treble', 4, 'none', 'B4q Bb4q A4q B4q | C5w'),
  m('s3', 'treble', 4, 'none', 'C5q C#5q D5q C5q | D5w'),
  m('s4', 'treble', 4, 'none', 'G4q G#4q A4q G4q | A4w'),
  m('s5', 'treble', 4, 'none', 'E5q Eb5q D5q E5q | D5w'),
  m('s6', 'treble', 4, 'none', 'A4q Ab4q G4q A4q | G4w'),
];

/** Treble, a new box starts fresh (MF). */
export const MF: readonly Melody[] = [
  m('f1', 'treble', 4, 'none', 'G4q F#4q G4h | F4q E4q F4h'),
  m('f2', 'treble', 4, 'none', 'A4q Bb4q A4h | B4q C5q B4h'),
  m('f3', 'treble', 4, 'none', 'D5q C#5q D5h | C5q D5q C5h'),
  m('f4', 'treble', 4, 'none', 'G4q Ab4q G4h | A4q G4q A4h'),
];

/** Bass (MB). */
export const MB: readonly Melody[] = [
  m('b1', 'bass', 4, 'none', 'C3q D3q E3q F3q | G3h G3h'),
  m('b2', 'bass', 4, 'none', 'G3q F3q E3q D3q | C3w'),
  m('b3', 'bass', 4, 'none', 'C3q E3q G3h | E3q D3q C3h'),
  m('b4', 'bass', 4, 'none', 'F3q F#3q G3q F3q | E3w'),
  m('b5', 'bass', 4, 'none', 'B2q Bb2q A2q B2q | C3w'),
  m('b6', 'bass', 4, 'none', 'G2q A2q B2q C3q | D3w'),
  m('b7', 'bass', 3, 'none', 'C3h E3q | G3h.'),
  m('b8', 'bass', 4, 'none', 'E3q Eb3q D3q E3q | C3w'),
];

/** Home signs (MK). */
export const MK: readonly Melody[] = [
  m('kg1', 'treble', 4, 'G', 'G4q A4q B4q C5q | D5q C5q B4h'),
  m('kg2', 'treble', 4, 'G', 'G4q F4q E4q F4q | G4w'),
  m('kg3', 'treble', 4, 'G', 'D4q E4q F4q G4q | A4q F4q G4h'),
  m('kg4', 'treble', 4, 'G', 'B4q A4q G4q F4q | G4w'),
  m('kf1', 'treble', 4, 'F', 'F4q G4q A4q B4q | C5w'),
  m('kf2', 'treble', 4, 'F', 'C5q B4q A4q G4q | F4w'),
  m('kf3', 'treble', 4, 'F', 'A4q B4q C5q B4q | A4h F4h'),
  m('kf4', 'treble', 4, 'F', 'F4q A4q B4q A4q | G4h F4h'),
  m('kd1', 'treble', 4, 'D', 'D4q E4q F4q G4q | A4q B4q C5q D5q'),
  m('kd2', 'treble', 4, 'D', 'A4q G4q F4q E4q | D4w'),
  m('kd3', 'treble', 4, 'D', 'D5q C5q B4q A4q | D5w'),
  m('kb1', 'treble', 4, 'Bb', 'B4q C5q D5q E5q | D5q C5q B4h'),
  m('kb2', 'treble', 4, 'Bb', 'F4q G4q A4q B4q | C5q D5q E5h'),
  m('kb3', 'treble', 4, 'Bb', 'D5q E5q D5q C5q | B4w'),
  m('kgb1', 'bass', 4, 'G', 'G2q A2q B2q C3q | D3q E3q F3q G3q'),
  m('kfb1', 'bass', 4, 'F', 'F3q E3q D3q C3q | B2q A2q B2q C3q'),
];

/** Natural beats the home sign (MN). */
export const MN: readonly Melody[] = [
  m('n1', 'treble', 4, 'G', 'G4q F4q E4q Fn4q | G4w'),
  m('n2', 'treble', 4, 'G', 'Fn4q G4q F4q E4q | F4w'),
  m('n3', 'treble', 4, 'F', 'Bn4q C5q B4q A4q | B4w'),
  m('n4', 'treble', 4, 'D', 'Cn5q D5q C5q B4q | C5w'),
];

/** Both hands (MH): the first text is the treble staff (right hand), the second the bass staff. */
export const MH: readonly Melody[] = [
  grand('h1', 4, 'C4q D4q E4q F4q | G4w', 'C3w | G2w'),
  grand('h2', 4, 'E4h G4h | C5w', 'C3w | C3w'),
  grand('h3', 4, 'G4q F4q E4q D4q | C4w', 'G2h B2h | C3w'),
  grand('h4', 4, 'C5q B4q A4q G4q | C5w', 'F3w | C3w'),
  grand('h5', 4, 'E4q E4q F4q G4q | G4q F4q E4h', 'C3h G2h | C3h G2h'),
  grand('h6', 3, 'C4h E4q | G4h.', 'C3h. | C3h.'),
];

/** Every tune of the course (not stacks), in curriculum order. */
export const MELODIES: readonly Melody[] = [...MT, ...MS, ...MF, ...MB, ...MK, ...MN, ...MH];

function stackEvent(bottom: Note): MusicEvent {
  const base = diatonicIndex(bottom);
  const notes = [0, 2, 4].map((up) => {
    const note = noteFromDiatonic(base + up);
    if (note === null) throw new Error(`Stack above ${bottom} leaves the range`);
    return { note, printed: null };
  });
  return { kind: 'note', dur: 'w', notes };
}

function stack(id: string, clef: Clef, bottom: Note, lower?: Note): Melody {
  const upper: Staffline = { clef, boxes: [[stackEvent(bottom)]] };
  if (lower === undefined) return { id, time: 4, home: 'none', staffs: [upper] };
  const bassNote: MusicEvent = {
    kind: 'note',
    dur: 'w',
    notes: [{ note: lower, printed: null }],
  };
  return {
    id,
    time: 4,
    home: 'none',
    staffs: [upper, { clef: 'bass', boxes: [[bassNote]] }],
  };
}

/** Treble stacks (ST): C-E-G, D-F-A, E-G-B, F-A-C, G-B-D, A-C-E. */
export const ST: readonly Melody[] = (['C4', 'D4', 'E4', 'F4', 'G4', 'A4'] as const).map((b) =>
  stack(`st-${b}`, 'treble', b),
);
/** Bass stacks (SB): F-A-C, G-B-D, A-C-E, C-E-G, D-F-A. */
export const SB: readonly Melody[] = (['F2', 'G2', 'A2', 'C3', 'D3'] as const).map((b) =>
  stack(`sb-${b}`, 'bass', b),
);
/** The C, F and G treble stacks (SCFG). */
export const SCFG: readonly Melody[] = pick(ST, ['st-C4', 'st-F4', 'st-G4']);
/** Hands-together stacks (SH): a bass note under the treble stack of the same letter. */
export const SH: readonly Melody[] = (
  [
    ['C4', 'C3'],
    ['F4', 'F2'],
    ['G4', 'G2'],
  ] as const
).map(([top, low]) => stack(`sh-${top}`, 'treble', top, low));

/** Every stack of the course. */
export const STACKS: readonly Melody[] = [...ST, ...SB, ...SH];
