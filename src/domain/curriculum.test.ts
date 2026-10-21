import { describe, expect, it } from 'vitest';
import { ALL_CARDS, NATURAL_CARDS, SIGN_CARDS, isNaturalCard, type CardId } from './cards';
import { CONCEPT_CARD_IDS, CONCEPT_CARDS } from './content';
import {
  CHECKPOINTS,
  MIXES,
  UNITS,
  allLessonIds,
  findCheckpoint,
  findLesson,
  levelLessons,
  pathLessons,
  unitOf,
  type LessonDef,
} from './curriculum';

const lv1 = pathLessons();
/** Course part 1 (units 1–11): natural cards only, the SPEC 8.1 self-check applies to these. */
const part1 = lv1.filter((l) => l.unit <= 11);
const part1Checkpoints = CHECKPOINTS.filter((c) => c.afterUnit <= 10);

describe('curriculum counts', () => {
  it('has 19 units (M11), 79 level-1 lessons, 36 level-2/3 lessons and 5 checkpoints', () => {
    expect(UNITS.map((u) => u.n)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
    expect(lv1).toHaveLength(43 + 18 + 18);
    const levels = UNITS.flatMap((u) => [...levelLessons(u.n, 2), ...levelLessons(u.n, 3)]);
    expect(levels).toHaveLength(36);
    expect(CHECKPOINTS.map((c) => c.id)).toEqual(['cp-a', 'cp-b', 'cp-c', 'cp-d', 'cp-e']);
    expect(allLessonIds()).toHaveLength(79 + 36 + 5);
  });

  it('lessons per unit match CURRICULUM.md', () => {
    expect(UNITS.map((u) => u.lessons.length)).toEqual([
      4, 3, 4, 5, 3, 4, 4, 3, 4, 5, 4, 4, 5, 5, 4, 5, 5, 4, 4,
    ]);
  });
});

describe('curriculum self-check (SPEC 4.9)', () => {
  const everyLesson: LessonDef[] = [
    ...lv1,
    ...UNITS.flatMap((u) => [...levelLessons(u.n, 2), ...levelLessons(u.n, 3)]),
  ];

  it('ids are unique', () => {
    const ids = allLessonIds();
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('ids are well formed (match the validator id regex)', () => {
    for (const id of allLessonIds()) expect(id).toMatch(/^[a-z0-9-]{1,32}$/);
  });
  it('every newCards is inside its pool', () => {
    for (const l of everyLesson) for (const c of l.newCards) expect(l.pool).toContain(c);
  });
  it('every pool card is a real card and pools have no duplicates', () => {
    for (const l of everyLesson) {
      expect(new Set(l.pool).size).toBe(l.pool.length);
      for (const c of l.pool) expect(ALL_CARDS).toContain(c);
    }
    for (const cp of CHECKPOINTS) for (const c of cp.pool) expect(ALL_CARDS).toContain(c);
  });
  it('SPEC 8.1 self-check: every part-1 pool, newCards list and checkpoint pool is natural cards only', () => {
    for (const l of [...part1, ...everyLesson.filter((x) => x.level > 1)]) {
      for (const c of [...l.pool, ...l.newCards])
        expect(isNaturalCard(c), `${l.id} ${c}`).toBe(true);
    }
    for (const cp of part1Checkpoints)
      for (const c of cp.pool) expect(isNaturalCard(c), cp.id).toBe(true);
  });
  it('a card is new at most once on the whole level-1 path, and all 46 are introduced', () => {
    const seen: CardId[] = lv1.flatMap((l) => l.newCards);
    expect(new Set(seen).size).toBe(seen.length);
    expect([...seen].sort()).toEqual([...ALL_CARDS].sort());
    // units 12-15 introduce exactly the 12 sign cards, and nothing before them does
    expect(
      lv1
        .filter((l) => l.unit >= 12)
        .flatMap((l) => l.newCards)
        .sort(),
    ).toEqual([...SIGN_CARDS].sort());
  });
  it('every pool card was introduced in the same or an earlier lesson', () => {
    const introduced = new Set<CardId>();
    for (const l of lv1) {
      for (const c of l.newCards) introduced.add(c);
      for (const c of l.pool) expect(introduced, `${l.id} uses ${c}`).toContain(c);
    }
  });
  it('checkpoint pools only use cards introduced by their unit', () => {
    for (const cp of CHECKPOINTS) {
      const introduced = new Set(
        lv1.filter((l) => l.unit <= cp.afterUnit).flatMap((l) => l.newCards),
      );
      for (const c of cp.pool) expect(introduced, `${cp.id} uses ${c}`).toContain(c);
    }
  });
  it('mixes sum to 100', () => {
    for (const l of everyLesson) {
      const sum = Object.values(l.mix).reduce((a, b) => a + b, 0);
      expect(sum, l.id).toBe(100);
    }
    for (const [name, mix] of Object.entries(MIXES)) {
      expect(
        Object.values(mix).reduce((a, b) => a + b, 0),
        name,
      ).toBe(100);
    }
  });
  it('level 2/3 lessons exist exactly for units 2-10', () => {
    for (const u of UNITS) {
      const expected = u.n >= 2 && u.n <= 10 ? 2 : 0;
      expect(levelLessons(u.n, 2), `unit ${String(u.n)} L2`).toHaveLength(expected);
      expect(levelLessons(u.n, 3), `unit ${String(u.n)} L3`).toHaveLength(expected);
    }
  });
  it('level lessons follow CURRICULUM section 1', () => {
    for (const u of UNITS.filter((x) => x.n >= 2 && x.n <= 10)) {
      const union = new Set(u.lessons.flatMap((l) => l.pool));
      const l2 = levelLessons(u.n, 2);
      const l3 = levelLessons(u.n, 3);
      expect(l2.map((l) => l.id)).toEqual([`u${String(u.n)}-lv2-a`, `u${String(u.n)}-lv2-b`]);
      expect(l3.map((l) => l.id)).toEqual([`u${String(u.n)}-lv3-a`, `u${String(u.n)}-lv3-b`]);
      expect(l2.map((l) => l.title)).toEqual(['Level 2 · Keys A', 'Level 2 · Keys B']);
      expect(l3.map((l) => l.title)).toEqual(['Level 3 · Master A', 'Level 3 · Master B']);
      for (const l of [...l2, ...l3]) {
        expect(new Set(l.pool)).toEqual(union);
        expect(l.newCards).toEqual([]);
        expect(l.conceptCards).toEqual([]);
        expect(l.questionCount).toBe(10);
        expect(l.render).toBe(u.lessons[0]?.render);
      }
      for (const l of l2) expect(l.mix).toEqual({ 'name-note': 40, 'find-key-letter': 60 });
      for (const l of l3)
        expect(l.mix).toEqual({ 'name-note': 20, 'find-key-exact': 40, 'find-on-staff': 40 });
    }
  });
  it('question counts, renders and levels are right', () => {
    for (const l of part1) {
      expect(l.level).toBe(1);
      expect(l.questionCount, l.id).toBe(l.unit === 1 ? 8 : 10);
      expect(l.render, l.id).toBe(l.unit === 8 || l.unit === 9 ? 'grand' : 'single');
    }
    for (const l of lv1.filter((x) => x.unit >= 12)) {
      expect(l.level).toBe(1);
      expect(l.questionCount, l.id).toBe(10);
    }
  });
  it('units 12-15 follow CURRICULUM section 10 (renders, mixes, showNaturals)', () => {
    const grand = ['u15-l2', 'u15-l4'];
    const naturals = ['u15-l1', 'u15-l3'];
    for (const l of lv1.filter((x) => x.unit >= 12 && x.unit <= 15)) {
      expect(l.render, l.id).toBe(grand.includes(l.id) ? 'grand' : 'single');
      expect(l.material?.showNaturals === true, l.id).toBe(naturals.includes(l.id));
      const expected =
        l.id === 'u13-l4'
          ? MIXES.PKeys
          : l.id === 'u15-l1'
            ? MIXES.PName
            : l.id === 'u15-l3'
              ? MIXES.PBoth
              : MIXES.P1;
      expect(l.mix, l.id).toEqual(expected);
    }
    expect(MIXES.P1).toEqual({ 'name-accidental': 60, 'find-key-pitch': 40 });
    expect(MIXES.PKeys).toEqual({ 'find-key-pitch': 70, 'name-accidental': 30 });
    expect(MIXES.PBoth).toEqual({ 'name-accidental': 50, 'find-key-pitch': 50 });
    expect(MIXES.PName).toEqual({ 'name-accidental': 100 });
  });
  it('units 16-19 and cp-e follow CURRICULUM section 10 (material, mixes, concept cards)', () => {
    const rhythm = lv1.filter((x) => x.unit >= 16 && x.unit <= 19);
    // id → [patterns, events, mix name]
    const table: Record<string, [string[] | undefined, string[], keyof typeof MIXES]> = {
      'u16-l1': [undefined, ['RA'], 'R1'],
      'u16-l2': [undefined, ['RA'], 'R2'],
      'u16-l3': [['RA'], ['RA'], 'R3'],
      'u16-l4': [['RA'], ['RA'], 'R4'],
      'u16-l5': [['RA'], ['RA'], 'R5'],
      'u17-l1': [['RA'], ['RA'], 'B1'],
      'u17-l2': [['RA'], ['RA'], 'B2'],
      'u17-l3': [['RA', 'RD'], ['RA', 'RD'], 'B1'],
      'u17-l4': [['RD'], ['RA', 'RD'], 'B3'],
      'u17-l5': [['RA', 'RD'], ['RA', 'RD'], 'B4'],
      'u18-l1': [['RR-Q'], ['RA', 'RR'], 'Q1'],
      'u18-l2': [['RR'], ['RA', 'RD', 'RR'], 'Q2'],
      'u18-l3': [['RR'], ['RR'], 'Q3'],
      'u18-l4': [['RA', 'RD', 'RR'], ['RA', 'RD', 'RR'], 'Q4'],
      'u19-l1': [undefined, ['RA', 'RE'], 'H1'],
      'u19-l2': [['RE'], ['RA', 'RE'], 'B3'],
      'u19-l3': [['RE'], ['RA', 'RE'], 'H2'],
      'u19-l4': [['RA', 'RD', 'RR', 'RE'], ['RA', 'RD', 'RR', 'RE'], 'Q4'],
    };
    expect(rhythm.map((l) => l.id)).toEqual(Object.keys(table));
    for (const l of rhythm) {
      const [patterns, events, mix] = table[l.id] ?? [undefined, [], 'R1'];
      expect(l.render, l.id).toBe('rhythm');
      expect(l.questionCount, l.id).toBe(10);
      expect(l.mix, l.id).toEqual(MIXES[mix]);
      expect(l.material?.rhythmPatterns, l.id).toEqual(patterns);
      expect(l.material?.rhythmEvents, l.id).toEqual(events);
    }
    const cp = findCheckpoint('cp-e');
    expect(cp?.mix).toEqual({ 'beats-of': 30, 'count-box': 35, 'finish-box': 35 });
    expect(cp?.material).toEqual({
      rhythmPatterns: ['RA', 'RD', 'RR', 'RE'],
      rhythmEvents: ['RA', 'RD', 'RR', 'RE'],
    });
    expect(cp?.pool).toEqual([]);
  });
  it('the part-2 mixes of CURRICULUM section 8 (rhythm) are transcribed exactly', () => {
    expect(MIXES.R1).toEqual({ 'beats-of': 100 });
    expect(MIXES.R2).toEqual({ 'beats-of': 60, 'which-longer': 40 });
    expect(MIXES.R3).toEqual({ 'hear-rhythm': 60, 'beats-of': 40 });
    expect(MIXES.R4).toEqual({ 'which-longer': 50, 'hear-rhythm': 50 });
    expect(MIXES.R5).toEqual({ 'beats-of': 40, 'which-longer': 30, 'hear-rhythm': 30 });
    expect(MIXES.B1).toEqual({ 'finish-box': 60, 'beats-of': 40 });
    expect(MIXES.B2).toEqual({ 'finish-box': 70, 'beats-of': 30 });
    expect(MIXES.B3).toEqual({ 'count-box': 50, 'finish-box': 50 });
    expect(MIXES.B4).toEqual({ 'count-box': 30, 'finish-box': 40, 'hear-rhythm': 30 });
    expect(MIXES.Q1).toEqual({ 'beats-of': 50, 'finish-box': 50 });
    expect(MIXES.Q2).toEqual({ 'beats-of': 50, 'count-box': 50 });
    expect(MIXES.Q3).toEqual({ 'hear-rhythm': 60, 'finish-box': 40 });
    expect(MIXES.Q4).toEqual({
      'beats-of': 25,
      'count-box': 25,
      'finish-box': 25,
      'hear-rhythm': 25,
    });
    expect(MIXES.H1).toEqual({ 'beats-of': 50, 'which-longer': 50 });
    expect(MIXES.H2).toEqual({ 'hear-rhythm': 70, 'beats-of': 30 });
  });
  it('units 12-25 have no levels 2-3', () => {
    for (let n = 12; n <= 25; n++) {
      expect(levelLessons(n, 2)).toHaveLength(0);
      expect(levelLessons(n, 3)).toHaveLength(0);
    }
  });
  it('unit 1 and 11 lessons use the special mixes and have no pool', () => {
    expect(UNITS[0]?.lessons.map((l) => l.mix)).toEqual([
      MIXES.U1Alphabet,
      MIXES.U1Keys,
      MIXES.U1Staff,
      MIXES.U1Clefs,
    ]);
    for (const l of UNITS[10]?.lessons ?? []) {
      expect(l.mix).toEqual({ 'step-skip': 100 });
      expect(l.pool).toEqual([]);
      expect(l.stepSkipConfig).toBeDefined();
    }
    expect(UNITS[10]?.lessons.map((l) => l.stepSkipConfig)).toEqual([
      { clefs: ['treble'], intervals: ['step'], buttons: 2 },
      { clefs: ['treble'], intervals: ['step', 'skip'], buttons: 4 },
      { clefs: ['bass'], intervals: ['step', 'skip'], buttons: 4 },
      { clefs: ['treble', 'bass'], intervals: ['step', 'skip'], buttons: 4 },
    ]);
  });
  it('every concept card used exists, and every defined concept card is used', () => {
    const used = new Set(lv1.flatMap((l) => l.conceptCards));
    for (const id of used) expect(CONCEPT_CARD_IDS).toContain(id);
    for (const id of CONCEPT_CARD_IDS) expect(used, id).toContain(id);
    expect(Object.keys(CONCEPT_CARDS).sort()).toEqual([...CONCEPT_CARD_IDS].sort());
    expect(CONCEPT_CARD_IDS).toHaveLength(24 + 7 + 10);
  });
  it('a checkpoint with a mix really carries it (cp-d is all name-accidental)', () => {
    expect(findCheckpoint('cp-d')?.mix).toEqual({ 'name-accidental': 100 });
    for (const cp of part1Checkpoints) expect(cp.mix).toBeUndefined();
  });
  it('unit colours are the unit tokens', () => {
    for (const u of UNITS) expect(u.color).toBe(`--unit-${String(u.n)}`);
  });
});

describe('curriculum transcription (spot checks against CURRICULUM.md)', () => {
  const rows: [string, string, string[], number][] = [
    // id, title, newCards (short), pool size
    ['u1-l1', 'The musical alphabet', [], 0],
    ['u1-l2', 'The piano keys', [], 0],
    ['u1-l3', 'Lines and spaces', [], 0],
    ['u1-l4', 'Two clefs', [], 0],
    ['u2-l1', 'Middle C and Treble G', ['treble-C4', 'treble-G4'], 2],
    ['u2-l2', 'Treble C', ['treble-C5'], 3],
    ['u2-l3', 'Landmark review', [], 3],
    ['u3-l1', 'D, next to Middle C', ['treble-D4'], 4],
    ['u3-l2', 'Around Treble G', ['treble-F4', 'treble-A4'], 6],
    ['u3-l3', 'Around Treble C', ['treble-B4', 'treble-D5'], 8],
    ['u3-l4', 'Neighbours review', [], 8],
    ['u4-l1', 'Bottom line E', ['treble-E4'], 9],
    ['u4-l2', 'Top of the staff', ['treble-E5', 'treble-F5'], 11],
    ['u4-l3', 'Treble lines', [], 5],
    ['u4-l4', 'Treble spaces', [], 4],
    ['u4-l5', 'Treble staff review', [], 11],
    ['u5-l1', 'Middle C and Bass F', ['bass-C4', 'bass-F3'], 2],
    ['u5-l2', 'Bass C', ['bass-C3'], 3],
    ['u5-l3', 'Landmark review', [], 3],
    ['u6-l1', 'Around Bass F', ['bass-E3', 'bass-G3'], 5],
    ['u6-l2', 'Around Bass C', ['bass-B2', 'bass-D3'], 7],
    ['u6-l3', 'Just below Middle C', ['bass-A3', 'bass-B3'], 9],
    ['u6-l4', 'Neighbours review', [], 9],
    ['u7-l1', 'Bottom of the staff', ['bass-G2', 'bass-A2'], 11],
    ['u7-l2', 'Bass lines', [], 5],
    ['u7-l3', 'Bass spaces', [], 4],
    ['u7-l4', 'Bass staff review', [], 11],
    ['u8-l1', 'Landmarks together', [], 6],
    ['u8-l2', 'All the notes', [], 22],
    ['u8-l3', 'Grand staff review', [], 22],
    ['u9-l1', 'Below the treble staff', ['treble-B3', 'treble-A3'], 5],
    ['u9-l2', 'Above the bass staff', ['bass-D4', 'bass-E4'], 5],
    ['u9-l3', 'Same note, two homes', [], 10],
    ['u9-l4', 'Middle review', [], 10],
    ['u10-l1', 'Above the treble staff', ['treble-G5', 'treble-A5'], 6],
    ['u10-l2', 'Up to High C', ['treble-B5', 'treble-C6'], 5],
    ['u10-l3', 'Below the bass staff', ['bass-F2', 'bass-E2'], 5],
    ['u10-l4', 'Down to Low C', ['bass-D2', 'bass-C2'], 5],
    ['u10-l5', 'High and low review', [], 10],
    ['u11-l1', 'Steps', [], 0],
    ['u11-l2', 'Skips', [], 0],
    ['u11-l3', 'Bass steps and skips', [], 0],
    ['u11-l4', 'Both clefs', [], 0],
    ['u12-l1', 'F♯', ['treble-F#4'], 3],
    ['u12-l2', 'C♯', ['treble-C#5'], 4],
    ['u12-l3', 'G♯', ['treble-G#4'], 5],
    ['u12-l4', 'Sharps review', [], 6],
    ['u13-l1', 'B♭', ['treble-Bb4'], 3],
    ['u13-l2', 'E♭', ['treble-Eb5'], 4],
    ['u13-l3', 'A♭', ['treble-Ab4'], 5],
    ['u13-l4', 'One key, two names', [], 6],
    ['u13-l5', 'Sharps and flats review', [], 9],
    ['u14-l1', 'F♯ and C♯', ['bass-F#3', 'bass-C#3'], 4],
    ['u14-l2', 'G♯', ['bass-G#3'], 4],
    ['u14-l3', 'B♭ and E♭', ['bass-Bb2', 'bass-Eb3'], 4],
    ['u14-l4', 'A♭', ['bass-Ab2'], 5],
    ['u14-l5', 'Bass review', [], 8],
    ['u15-l1', 'The natural sign', [], 6],
    ['u15-l2', 'Both clefs', [], 12],
    ['u15-l3', 'Plain or not?', [], 8],
    ['u15-l4', 'Signs review', [], 18],
    ['u16-l1', 'The beat', [], 0],
    ['u16-l2', '2-beat notes', [], 0],
    ['u16-l3', 'Listen to the beat', [], 0],
    ['u16-l4', 'Long and short', [], 0],
    ['u16-l5', 'Beats review', [], 0],
    ['u17-l1', 'Boxes of 4', [], 0],
    ['u17-l2', 'Finish the box', [], 0],
    ['u17-l3', '3-beat notes', [], 0],
    ['u17-l4', 'Boxes of 3 and 2', [], 0],
    ['u17-l5', 'Boxes review', [], 0],
    ['u18-l1', '1-beat rests', [], 0],
    ['u18-l2', 'Longer rests', [], 0],
    ['u18-l3', 'Hear the quiet', [], 0],
    ['u18-l4', 'Rests review', [], 0],
    ['u19-l1', 'Half-beat pairs', [], 0],
    ['u19-l2', 'Counting with pairs', [], 0],
    ['u19-l3', 'Listen for pairs', [], 0],
    ['u19-l4', 'Rhythm review', [], 0],
  ];
  it('lists every level-1 lesson in order (the 4 + 39 + 18 + 18 rows)', () => {
    expect(rows.map((r) => r[0])).toEqual(lv1.map((l) => l.id));
  });
  it.each(rows)('%s "%s"', (id, title, newCards, poolSize) => {
    const l = findLesson(id);
    expect(l?.title).toBe(title);
    expect(l?.newCards).toEqual(newCards);
    expect(l?.pool).toHaveLength(poolSize);
  });
  it('concept cards per lesson match the tables', () => {
    const got = Object.fromEntries(
      lv1.filter((l) => l.conceptCards.length > 0).map((l) => [l.id, l.conceptCards]),
    );
    expect(got).toEqual({
      'u1-l1': ['c-alphabet'],
      'u1-l2': ['c-black-keys', 'c-find-c', 'c-white-keys'],
      'u1-l3': ['c-staff', 'c-line-space', 'c-higher'],
      'u1-l4': ['c-treble-clef', 'c-bass-clef', 'c-grand-staff'],
      'u2-l1': ['c-landmarks'],
      'u3-l1': ['c-steps'],
      'u4-l3': ['c-treble-lines'],
      'u4-l4': ['c-treble-spaces'],
      'u5-l1': ['c-bass-landmarks'],
      'u7-l2': ['c-bass-lines'],
      'u7-l3': ['c-bass-spaces'],
      'u8-l1': ['c-grand-together'],
      'u9-l1': ['c-ledger'],
      'u9-l3': ['c-two-homes'],
      'u10-l1': ['c-going-higher'],
      'u10-l3': ['c-going-lower'],
      'u11-l1': ['c-read-steps'],
      'u11-l2': ['c-skips'],
      'u12-l1': ['c-sharp', 'c-sharp-staff'],
      'u13-l1': ['c-flat'],
      'u13-l4': ['c-two-names'],
      'u14-l1': ['c-bass-signs'],
      'u15-l1': ['c-natural'],
      'u15-l2': ['c-signs-grand'],
      'u16-l1': ['c-beat', 'c-one-beat'],
      'u16-l2': ['c-two-beat'],
      'u16-l3': ['c-listen'],
      'u17-l1': ['c-box', 'c-top-number'],
      'u17-l3': ['c-three-beat'],
      'u18-l1': ['c-rest'],
      'u18-l2': ['c-long-rests'],
      'u19-l1': ['c-half-beats'],
    });
  });
  it('unit titles and subtitles match', () => {
    expect(UNITS.map((u) => [u.title, u.subtitle])).toEqual([
      ['Meet the music', 'Letters, keys and the staff'],
      ['Treble landmarks', 'Three notes to find your way'],
      ['Treble neighbours', 'One step from a landmark'],
      ['The whole treble staff', 'Every line and space'],
      ['Bass landmarks', 'Landmarks for your left hand'],
      ['Bass neighbours', 'One step from a landmark'],
      ['The whole bass staff', 'Every line and space'],
      ['The grand staff', 'Both hands together'],
      ['Ledger lines near Middle C', 'Notes between the staves'],
      ['High and low', 'Ledger lines on the outside'],
      ['Steps and skips', 'Read by distance'],
      ['Sharps', 'One key to the right'],
      ['Flats', 'One key to the left'],
      ['Bass sharps and flats', 'The same signs, lower down'],
      ['The natural sign', 'Back to the plain key'],
      ['How long is a note?', 'Counting beats'],
      ['Beats in a box', 'Boxes of 4, 3 and 2'],
      ['Rests', 'Quiet beats count too'],
      ['Half beats', 'Two notes in one beat'],
    ]);
  });
  it('checkpoints match', () => {
    expect(
      CHECKPOINTS.map((c) => [c.id, c.title, c.afterUnit, c.completesUnits, c.pool.length]),
    ).toEqual([
      ['cp-a', 'Treble checkpoint', 4, [1, 2, 3, 4], 11],
      ['cp-b', 'Bass checkpoint', 7, [5, 6, 7], 11],
      ['cp-c', 'Grand checkpoint', 10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 34],
      ['cp-d', 'Sharps and flats checkpoint', 15, [12, 13, 14, 15], 12],
      ['cp-e', 'Rhythm checkpoint', 19, [16, 17, 18, 19], 0],
    ]);
    expect(findCheckpoint('cp-a')?.pool[0]).toBe('treble-C4');
    expect(findCheckpoint('cp-b')?.pool[0]).toBe('bass-G2');
    expect(findCheckpoint('cp-c')?.pool).toEqual([...NATURAL_CARDS]);
  });
});

describe('lookups', () => {
  it('findLesson / findCheckpoint / unitOf', () => {
    expect(findLesson('u2-l1')?.unit).toBe(2);
    expect(findLesson('u4-lv3-b')?.level).toBe(3);
    expect(findLesson('cp-a')).toBeUndefined();
    expect(findLesson('review')).toBeUndefined();
    expect(findLesson('__proto__')).toBeUndefined();
    expect(findCheckpoint('cp-b')?.afterUnit).toBe(7);
    expect(findCheckpoint('cp-z')).toBeUndefined();
    expect(unitOf(3)?.title).toBe('Treble neighbours');
    expect(unitOf(12)?.title).toBe('Sharps');
    expect(unitOf(16)?.title).toBe('How long is a note?');
    expect(unitOf(20)).toBeUndefined();
  });
});
