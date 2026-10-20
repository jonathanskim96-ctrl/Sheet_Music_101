// The course, transcribed from docs/build/CURRICULUM.md. Ids here are permanent (see ids.lock.json).
import { NATURAL_CARDS, cardId, type CardId } from './cards';
import type { ConceptCardId } from './content';
import type { Clef, Note } from './notes';

export type LessonId = string; // 'u2-l1', 'u2-lv2-a', 'cp-a' …

export type QuestionKind =
  | 'name-note'
  | 'find-key-letter'
  | 'find-key-exact'
  | 'find-on-staff'
  | 'step-skip'
  | 'alphabet-next'
  | 'keyboard-letter'
  | 'line-or-space'
  | 'higher-lower'
  | 'clef-identify'
  // Course part 2, built so far: sharp/flat/natural notes (M10). Rhythm, tune and stack kinds follow.
  | 'name-accidental'
  | 'find-key-pitch';

/** Rhythm and stack set ids used by course part 2 (SPEC 8.8); the sets themselves arrive in M11/M13. */
export type RhythmSetId = 'RA' | 'RD' | 'RR' | 'RE' | 'RR-Q';
export type StackSetId = 'ST' | 'SB' | 'SCFG' | 'SH';

/** Extra material a part-2 lesson or checkpoint draws its non-card questions from (SPEC 8.8). */
export interface LessonMaterial {
  rhythmPatterns?: RhythmSetId[];
  rhythmEvents?: RhythmSetId[];
  melodies?: string[]; // melody ids (sets expanded in curriculum.ts)
  markStaff?: 0 | 1; // u24-l2: marked notes only in the bass staff
  intervals?: { clefs: Clef[]; sizes: (2 | 3 | 4 | 5)[]; stacked: 'no' | 'yes' | 'mixed' };
  stacks?: StackSetId[];
  showNaturals?: boolean; // unit 15: natural cards are drawn with a printed natural sign
}

export interface LessonDef {
  id: LessonId;
  unit: number; // 1..25
  level: 1 | 2 | 3;
  title: string;
  conceptCards: ConceptCardId[]; // shown before questions, in order
  newCards: CardId[]; // get a Meet card, and 3 questions each
  pool: CardId[]; // every card this lesson may ask about (includes newCards)
  mix: Partial<Record<QuestionKind, number>>; // weights; must sum to 100
  questionCount: number; // 8 for unit 1, 10 otherwise, 15 checkpoints
  render: 'single' | 'grand' | 'rhythm';
  material?: LessonMaterial;
  stepSkipConfig?: {
    clefs: Clef[];
    intervals: ('step' | 'skip')[];
    buttons: 2 | 4;
  };
}

export interface UnitDef {
  n: number;
  title: string;
  subtitle: string;
  color: string; // token name, e.g. '--unit-2'
  lessons: LessonDef[]; // level-1 lessons only, in path order
}

export interface CheckpointDef {
  id: 'cp-a' | 'cp-b' | 'cp-c' | 'cp-d' | 'cp-e' | 'cp-f';
  title: string;
  afterUnit: number;
  completesUnits: number[];
  pool: CardId[];
  mix?: Mix; // part 2 only; the part-1 checkpoints are all name-the-note
  material?: LessonMaterial;
}

type Mix = LessonDef['mix'];

/** Question mixes by lesson type (CURRICULUM §1). */
export const MIXES = {
  L1: { 'name-note': 100 },
  L2: { 'name-note': 40, 'find-key-letter': 60 },
  L3: { 'name-note': 20, 'find-key-exact': 40, 'find-on-staff': 40 },
  U1Alphabet: { 'alphabet-next': 100 },
  U1Keys: { 'keyboard-letter': 100 },
  U1Staff: { 'line-or-space': 60, 'higher-lower': 40 },
  U1Clefs: { 'clef-identify': 60, 'higher-lower': 40 },
  U11: { 'step-skip': 100 },
  // Course part 2 (CURRICULUM §8)
  P1: { 'name-accidental': 60, 'find-key-pitch': 40 },
  PKeys: { 'find-key-pitch': 70, 'name-accidental': 30 },
  PBoth: { 'name-accidental': 50, 'find-key-pitch': 50 },
  PName: { 'name-accidental': 100 },
} as const satisfies Record<string, Mix>;

// ------------------------------------------------------------------ card list helpers

const tc = (...notes: Note[]): CardId[] => notes.map((n) => cardId('treble', n));
const bc = (...notes: Note[]): CardId[] => notes.map((n) => cardId('bass', n));

const TREBLE_11 = tc('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5');
const BASS_11 = bc('G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4');
// The 12 sharp/flat cards by short name (CURRICULUM §7); each is typed as a real SignCardId.
const FS4 = 'treble-F#4';
const GS4 = 'treble-G#4';
const AB4 = 'treble-Ab4';
const BB4 = 'treble-Bb4';
const CS5 = 'treble-C#5';
const EB5 = 'treble-Eb5';
const AB2 = 'bass-Ab2';
const BB2 = 'bass-Bb2';
const CS3 = 'bass-C#3';
const EB3 = 'bass-Eb3';
const FS3 = 'bass-F#3';
const GS3 = 'bass-G#3';
const TREBLE_SIGNS: CardId[] = [FS4, GS4, AB4, BB4, CS5, EB5];
const BASS_SIGNS: CardId[] = [AB2, BB2, CS3, EB3, FS3, GS3];

const MIDDLE_TREBLE = tc('A3', 'B3', 'C4', 'D4', 'E4');
const MIDDLE_BASS = bc('A3', 'B3', 'C4', 'D4', 'E4');

interface LessonSpec {
  id: LessonId;
  title: string;
  concept?: ConceptCardId[];
  newCards?: CardId[];
  pool: CardId[];
}

function noteUnit(
  n: number,
  title: string,
  subtitle: string,
  render: 'single' | 'grand',
  specs: LessonSpec[],
): UnitDef {
  return {
    n,
    title,
    subtitle,
    color: `--unit-${String(n)}`,
    lessons: specs.map((s) => ({
      id: s.id,
      unit: n,
      level: 1,
      title: s.title,
      conceptCards: s.concept ?? [],
      newCards: s.newCards ?? [],
      pool: s.pool,
      mix: MIXES.L1,
      questionCount: 10,
      render,
    })),
  };
}

interface SignLessonSpec extends LessonSpec {
  mix: Mix;
  render?: 'single' | 'grand';
  showNaturals?: boolean;
}

/** Units 12–15: one lesson per spec, each with its own question mix (CURRICULUM §10). */
function signUnit(
  n: number,
  title: string,
  subtitle: string,
  render: 'single' | 'grand',
  specs: SignLessonSpec[],
): UnitDef {
  return {
    n,
    title,
    subtitle,
    color: `--unit-${String(n)}`,
    lessons: specs.map((sp) => ({
      id: sp.id,
      unit: n,
      level: 1,
      title: sp.title,
      conceptCards: sp.concept ?? [],
      newCards: sp.newCards ?? [],
      pool: sp.pool,
      mix: sp.mix,
      questionCount: 10,
      render: sp.render ?? render,
      ...(sp.showNaturals === true ? { material: { showNaturals: true } } : {}),
    })),
  };
}

function unit1Lesson(
  id: LessonId,
  title: string,
  conceptCards: ConceptCardId[],
  mix: Mix,
): LessonDef {
  return {
    id,
    unit: 1,
    level: 1,
    title,
    conceptCards,
    newCards: [],
    pool: [],
    mix,
    questionCount: 8,
    render: 'single',
  };
}

function stepSkipLesson(
  id: LessonId,
  title: string,
  conceptCards: ConceptCardId[],
  config: NonNullable<LessonDef['stepSkipConfig']>,
): LessonDef {
  return {
    id,
    unit: 11,
    level: 1,
    title,
    conceptCards,
    newCards: [],
    pool: [],
    mix: MIXES.U11,
    questionCount: 10,
    render: 'single',
    stepSkipConfig: config,
  };
}

// ------------------------------------------------------------------ units

export const UNITS: readonly UnitDef[] = [
  {
    n: 1,
    title: 'Meet the music',
    subtitle: 'Letters, keys and the staff',
    color: '--unit-1',
    lessons: [
      unit1Lesson('u1-l1', 'The musical alphabet', ['c-alphabet'], MIXES.U1Alphabet),
      unit1Lesson(
        'u1-l2',
        'The piano keys',
        ['c-black-keys', 'c-find-c', 'c-white-keys'],
        MIXES.U1Keys,
      ),
      unit1Lesson(
        'u1-l3',
        'Lines and spaces',
        ['c-staff', 'c-line-space', 'c-higher'],
        MIXES.U1Staff,
      ),
      unit1Lesson(
        'u1-l4',
        'Two clefs',
        ['c-treble-clef', 'c-bass-clef', 'c-grand-staff'],
        MIXES.U1Clefs,
      ),
    ],
  },
  noteUnit(2, 'Treble landmarks', 'Three notes to find your way', 'single', [
    {
      id: 'u2-l1',
      title: 'Middle C and Treble G',
      concept: ['c-landmarks'],
      newCards: tc('C4', 'G4'),
      pool: tc('C4', 'G4'),
    },
    { id: 'u2-l2', title: 'Treble C', newCards: tc('C5'), pool: tc('C4', 'G4', 'C5') },
    { id: 'u2-l3', title: 'Landmark review', pool: tc('C4', 'G4', 'C5') },
  ]),
  noteUnit(3, 'Treble neighbours', 'One step from a landmark', 'single', [
    {
      id: 'u3-l1',
      title: 'D, next to Middle C',
      concept: ['c-steps'],
      newCards: tc('D4'),
      pool: tc('C4', 'D4', 'G4', 'C5'),
    },
    {
      id: 'u3-l2',
      title: 'Around Treble G',
      newCards: tc('F4', 'A4'),
      pool: tc('C4', 'D4', 'F4', 'G4', 'A4', 'C5'),
    },
    {
      id: 'u3-l3',
      title: 'Around Treble C',
      newCards: tc('B4', 'D5'),
      pool: tc('C4', 'D4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'),
    },
    {
      id: 'u3-l4',
      title: 'Neighbours review',
      pool: tc('C4', 'D4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'),
    },
  ]),
  noteUnit(4, 'The whole treble staff', 'Every line and space', 'single', [
    {
      id: 'u4-l1',
      title: 'Bottom line E',
      newCards: tc('E4'),
      pool: tc('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'),
    },
    { id: 'u4-l2', title: 'Top of the staff', newCards: tc('E5', 'F5'), pool: TREBLE_11 },
    {
      id: 'u4-l3',
      title: 'Treble lines',
      concept: ['c-treble-lines'],
      pool: tc('E4', 'G4', 'B4', 'D5', 'F5'),
    },
    {
      id: 'u4-l4',
      title: 'Treble spaces',
      concept: ['c-treble-spaces'],
      pool: tc('F4', 'A4', 'C5', 'E5'),
    },
    { id: 'u4-l5', title: 'Treble staff review', pool: TREBLE_11 },
  ]),
  noteUnit(5, 'Bass landmarks', 'Landmarks for your left hand', 'single', [
    {
      id: 'u5-l1',
      title: 'Middle C and Bass F',
      concept: ['c-bass-landmarks'],
      newCards: bc('C4', 'F3'),
      pool: bc('C4', 'F3'),
    },
    { id: 'u5-l2', title: 'Bass C', newCards: bc('C3'), pool: bc('C3', 'F3', 'C4') },
    { id: 'u5-l3', title: 'Landmark review', pool: bc('C3', 'F3', 'C4') },
  ]),
  noteUnit(6, 'Bass neighbours', 'One step from a landmark', 'single', [
    {
      id: 'u6-l1',
      title: 'Around Bass F',
      newCards: bc('E3', 'G3'),
      pool: bc('C3', 'E3', 'F3', 'G3', 'C4'),
    },
    {
      id: 'u6-l2',
      title: 'Around Bass C',
      newCards: bc('B2', 'D3'),
      pool: bc('B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'C4'),
    },
    {
      id: 'u6-l3',
      title: 'Just below Middle C',
      newCards: bc('A3', 'B3'),
      pool: bc('B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'),
    },
    {
      id: 'u6-l4',
      title: 'Neighbours review',
      pool: bc('B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'),
    },
  ]),
  noteUnit(7, 'The whole bass staff', 'Every line and space', 'single', [
    { id: 'u7-l1', title: 'Bottom of the staff', newCards: bc('G2', 'A2'), pool: BASS_11 },
    {
      id: 'u7-l2',
      title: 'Bass lines',
      concept: ['c-bass-lines'],
      pool: bc('G2', 'B2', 'D3', 'F3', 'A3'),
    },
    {
      id: 'u7-l3',
      title: 'Bass spaces',
      concept: ['c-bass-spaces'],
      pool: bc('A2', 'C3', 'E3', 'G3'),
    },
    { id: 'u7-l4', title: 'Bass staff review', pool: BASS_11 },
  ]),
  noteUnit(8, 'The grand staff', 'Both hands together', 'grand', [
    {
      id: 'u8-l1',
      title: 'Landmarks together',
      concept: ['c-grand-together'],
      pool: [...bc('C3', 'F3', 'C4'), ...tc('C4', 'G4', 'C5')],
    },
    { id: 'u8-l2', title: 'All the notes', pool: [...TREBLE_11, ...BASS_11] },
    { id: 'u8-l3', title: 'Grand staff review', pool: [...TREBLE_11, ...BASS_11] },
  ]),
  noteUnit(9, 'Ledger lines near Middle C', 'Notes between the staves', 'grand', [
    {
      id: 'u9-l1',
      title: 'Below the treble staff',
      concept: ['c-ledger'],
      newCards: tc('B3', 'A3'),
      pool: MIDDLE_TREBLE,
    },
    {
      id: 'u9-l2',
      title: 'Above the bass staff',
      newCards: bc('D4', 'E4'),
      pool: MIDDLE_BASS,
    },
    {
      id: 'u9-l3',
      title: 'Same note, two homes',
      concept: ['c-two-homes'],
      pool: [...MIDDLE_TREBLE, ...MIDDLE_BASS],
    },
    { id: 'u9-l4', title: 'Middle review', pool: [...MIDDLE_TREBLE, ...MIDDLE_BASS] },
  ]),
  noteUnit(10, 'High and low', 'Ledger lines on the outside', 'single', [
    {
      id: 'u10-l1',
      title: 'Above the treble staff',
      concept: ['c-going-higher'],
      newCards: tc('G5', 'A5'),
      pool: tc('C5', 'D5', 'E5', 'F5', 'G5', 'A5'),
    },
    {
      id: 'u10-l2',
      title: 'Up to High C',
      newCards: tc('B5', 'C6'),
      pool: tc('F5', 'G5', 'A5', 'B5', 'C6'),
    },
    {
      id: 'u10-l3',
      title: 'Below the bass staff',
      concept: ['c-going-lower'],
      newCards: bc('F2', 'E2'),
      pool: bc('E2', 'F2', 'G2', 'A2', 'B2'),
    },
    {
      id: 'u10-l4',
      title: 'Down to Low C',
      newCards: bc('D2', 'C2'),
      pool: bc('C2', 'D2', 'E2', 'F2', 'G2'),
    },
    {
      id: 'u10-l5',
      title: 'High and low review',
      pool: [...tc('F5', 'G5', 'A5', 'B5', 'C6'), ...bc('C2', 'D2', 'E2', 'F2', 'G2')],
    },
  ]),
  {
    n: 11,
    title: 'Steps and skips',
    subtitle: 'Read by distance',
    color: '--unit-11',
    lessons: [
      stepSkipLesson('u11-l1', 'Steps', ['c-read-steps'], {
        clefs: ['treble'],
        intervals: ['step'],
        buttons: 2,
      }),
      stepSkipLesson('u11-l2', 'Skips', ['c-skips'], {
        clefs: ['treble'],
        intervals: ['step', 'skip'],
        buttons: 4,
      }),
      stepSkipLesson('u11-l3', 'Bass steps and skips', [], {
        clefs: ['bass'],
        intervals: ['step', 'skip'],
        buttons: 4,
      }),
      stepSkipLesson('u11-l4', 'Both clefs', [], {
        clefs: ['treble', 'bass'],
        intervals: ['step', 'skip'],
        buttons: 4,
      }),
    ],
  },
  signUnit(12, 'Sharps', 'One key to the right', 'single', [
    {
      id: 'u12-l1',
      title: 'F♯',
      concept: ['c-sharp', 'c-sharp-staff'],
      newCards: [FS4],
      pool: [...tc('F4', 'G4'), FS4],
      mix: MIXES.P1,
    },
    {
      id: 'u12-l2',
      title: 'C♯',
      newCards: [CS5],
      pool: [...tc('C5', 'D5'), CS5, FS4],
      mix: MIXES.P1,
    },
    {
      id: 'u12-l3',
      title: 'G♯',
      newCards: [GS4],
      pool: [...tc('G4', 'A4'), GS4, FS4, CS5],
      mix: MIXES.P1,
    },
    {
      id: 'u12-l4',
      title: 'Sharps review',
      pool: [...tc('F4', 'G4', 'C5'), FS4, GS4, CS5],
      mix: MIXES.P1,
    },
  ]),
  signUnit(13, 'Flats', 'One key to the left', 'single', [
    {
      id: 'u13-l1',
      title: 'B♭',
      concept: ['c-flat'],
      newCards: [BB4],
      pool: [...tc('B4', 'A4'), BB4],
      mix: MIXES.P1,
    },
    {
      id: 'u13-l2',
      title: 'E♭',
      newCards: [EB5],
      pool: [...tc('E5', 'D5'), EB5, BB4],
      mix: MIXES.P1,
    },
    {
      id: 'u13-l3',
      title: 'A♭',
      newCards: [AB4],
      pool: [...tc('A4', 'G4'), AB4, BB4, EB5],
      mix: MIXES.P1,
    },
    {
      id: 'u13-l4',
      title: 'One key, two names',
      concept: ['c-two-names'],
      pool: [...TREBLE_SIGNS],
      mix: MIXES.PKeys,
    },
    {
      id: 'u13-l5',
      title: 'Sharps and flats review',
      pool: [...TREBLE_SIGNS, ...tc('F4', 'B4', 'E5')],
      mix: MIXES.P1,
    },
  ]),
  signUnit(14, 'Bass sharps and flats', 'The same signs, lower down', 'single', [
    {
      id: 'u14-l1',
      title: 'F♯ and C♯',
      concept: ['c-bass-signs'],
      newCards: [FS3, CS3],
      pool: [...bc('F3', 'C3'), FS3, CS3],
      mix: MIXES.P1,
    },
    {
      id: 'u14-l2',
      title: 'G♯',
      newCards: [GS3],
      pool: [...bc('G3'), FS3, CS3, GS3],
      mix: MIXES.P1,
    },
    {
      id: 'u14-l3',
      title: 'B♭ and E♭',
      newCards: [BB2, EB3],
      pool: [...bc('B2', 'E3'), BB2, EB3],
      mix: MIXES.P1,
    },
    {
      id: 'u14-l4',
      title: 'A♭',
      newCards: [AB2],
      pool: [...bc('A2'), AB2, BB2, EB3, GS3],
      mix: MIXES.P1,
    },
    {
      id: 'u14-l5',
      title: 'Bass review',
      pool: [...BASS_SIGNS, ...bc('F3', 'B2')],
      mix: MIXES.P1,
    },
  ]),
  signUnit(15, 'The natural sign', 'Back to the plain key', 'single', [
    {
      id: 'u15-l1',
      title: 'The natural sign',
      concept: ['c-natural'],
      pool: [...tc('F4', 'B4', 'C5'), FS4, BB4, CS5],
      mix: MIXES.PName,
      showNaturals: true,
    },
    {
      id: 'u15-l2',
      title: 'Both clefs',
      concept: ['c-signs-grand'],
      pool: [...TREBLE_SIGNS, ...BASS_SIGNS],
      mix: MIXES.P1,
      render: 'grand',
    },
    {
      id: 'u15-l3',
      title: 'Plain or not?',
      pool: [...tc('F4', 'B4'), FS4, BB4, ...bc('F3', 'B2'), FS3, BB2],
      mix: MIXES.PBoth,
      showNaturals: true,
    },
    {
      id: 'u15-l4',
      title: 'Signs review',
      pool: [...TREBLE_SIGNS, ...BASS_SIGNS, ...tc('F4', 'B4', 'C5'), ...bc('F3', 'B2', 'C3')],
      mix: MIXES.P1,
      render: 'grand',
    },
  ]),
];

export const CHECKPOINTS: readonly CheckpointDef[] = [
  {
    id: 'cp-a',
    title: 'Treble checkpoint',
    afterUnit: 4,
    completesUnits: [1, 2, 3, 4],
    pool: TREBLE_11,
  },
  { id: 'cp-b', title: 'Bass checkpoint', afterUnit: 7, completesUnits: [5, 6, 7], pool: BASS_11 },
  {
    id: 'cp-c',
    title: 'Grand checkpoint',
    afterUnit: 10,
    completesUnits: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    pool: [...NATURAL_CARDS],
  },
  {
    id: 'cp-d',
    title: 'Sharps and flats checkpoint',
    afterUnit: 15,
    completesUnits: [12, 13, 14, 15],
    pool: [...TREBLE_SIGNS, ...BASS_SIGNS],
    mix: MIXES.PName,
  },
];

// ------------------------------------------------------------------ levels 2 and 3

const LEVEL_TITLES: Record<2 | 3, readonly [string, string]> = {
  2: ['Level 2 · Keys A', 'Level 2 · Keys B'],
  3: ['Level 3 · Master A', 'Level 3 · Master B'],
};

function buildLevelLessons(): LessonDef[] {
  const out: LessonDef[] = [];
  for (const u of UNITS) {
    if (u.n < 2 || u.n > 10) continue;
    const pool: CardId[] = [];
    for (const l of u.lessons) for (const c of l.pool) if (!pool.includes(c)) pool.push(c);
    const render = u.lessons[0]?.render ?? 'single';
    for (const level of [2, 3] as const) {
      (['a', 'b'] as const).forEach((suffix, i) => {
        out.push({
          id: `u${String(u.n)}-lv${String(level)}-${suffix}`,
          unit: u.n,
          level,
          title: LEVEL_TITLES[level][i] ?? '',
          conceptCards: [],
          newCards: [],
          pool: [...pool],
          mix: level === 2 ? MIXES.L2 : MIXES.L3,
          questionCount: 10,
          render,
        });
      });
    }
  }
  return out;
}

const LEVEL_LESSONS: readonly LessonDef[] = buildLevelLessons();

// ------------------------------------------------------------------ helpers

/** All level-1 lessons in path order (unit 1 first). */
export function pathLessons(): LessonDef[] {
  return UNITS.flatMap((u) => u.lessons);
}

const BY_ID: ReadonlyMap<string, LessonDef> = new Map(
  [...pathLessons(), ...LEVEL_LESSONS].map((l) => [l.id, l]),
);

/** A lesson (any level) by id; undefined for unknown ids and for checkpoints. */
export function findLesson(id: string): LessonDef | undefined {
  return BY_ID.get(id);
}

/** A checkpoint by id. */
export function findCheckpoint(id: string): CheckpointDef | undefined {
  return CHECKPOINTS.find((c) => c.id === id);
}

/** The two lessons (a, b) of a level 2 or 3 for a unit; empty for units 1 and 11. */
export function levelLessons(unit: number, level: 2 | 3): LessonDef[] {
  return LEVEL_LESSONS.filter((l) => l.unit === unit && l.level === level);
}

/** Every id that can be a key of `Progress.lessons` (level 1, 2, 3 and checkpoints). */
export function allLessonIds(): string[] {
  return [
    ...pathLessons().map((l) => l.id),
    ...LEVEL_LESSONS.map((l) => l.id),
    ...CHECKPOINTS.map((c) => c.id),
  ];
}

/** The unit definition for a unit number. */
export function unitOf(n: number): UnitDef | undefined {
  return UNITS.find((u) => u.n === n);
}
