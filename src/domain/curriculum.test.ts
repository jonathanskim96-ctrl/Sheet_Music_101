import { describe, expect, it } from 'vitest';
import { NATURAL_CARDS, isNaturalCard, type CardId } from './cards';
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

describe('curriculum counts', () => {
  it('has 11 units, 43 level-1 lessons, 36 level-2/3 lessons and 3 checkpoints', () => {
    expect(UNITS.map((u) => u.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(lv1).toHaveLength(43);
    const levels = UNITS.flatMap((u) => [...levelLessons(u.n, 2), ...levelLessons(u.n, 3)]);
    expect(levels).toHaveLength(36);
    expect(CHECKPOINTS.map((c) => c.id)).toEqual(['cp-a', 'cp-b', 'cp-c']);
    expect(allLessonIds()).toHaveLength(43 + 36 + 3);
  });

  it('lessons per unit match CURRICULUM.md', () => {
    expect(UNITS.map((u) => u.lessons.length)).toEqual([4, 3, 4, 5, 3, 4, 4, 3, 4, 5, 4]);
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
      for (const c of l.pool) expect(NATURAL_CARDS).toContain(c);
    }
    for (const cp of CHECKPOINTS) for (const c of cp.pool) expect(NATURAL_CARDS).toContain(c);
  });
  it('SPEC 8.1 self-check: every part-1 pool, newCards list and checkpoint pool is natural cards only', () => {
    for (const l of everyLesson) {
      for (const c of [...l.pool, ...l.newCards])
        expect(isNaturalCard(c), `${l.id} ${c}`).toBe(true);
    }
    for (const cp of CHECKPOINTS)
      for (const c of cp.pool) expect(isNaturalCard(c), cp.id).toBe(true);
  });
  it('a card is new at most once on the whole level-1 path, and all 34 are introduced', () => {
    const seen: CardId[] = lv1.flatMap((l) => l.newCards);
    expect(new Set(seen).size).toBe(seen.length);
    expect([...seen].sort()).toEqual([...NATURAL_CARDS].sort());
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
    for (const l of lv1) {
      expect(l.level).toBe(1);
      expect(l.questionCount, l.id).toBe(l.unit === 1 ? 8 : 10);
      expect(l.render, l.id).toBe(l.unit === 8 || l.unit === 9 ? 'grand' : 'single');
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
    expect(CONCEPT_CARD_IDS).toHaveLength(24);
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
  ];
  it('lists every level-1 lesson in order (the 4 + 39 rows)', () => {
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
    ]);
  });
  it('checkpoints match', () => {
    expect(
      CHECKPOINTS.map((c) => [c.id, c.title, c.afterUnit, c.completesUnits, c.pool.length]),
    ).toEqual([
      ['cp-a', 'Treble checkpoint', 4, [1, 2, 3, 4], 11],
      ['cp-b', 'Bass checkpoint', 7, [5, 6, 7], 11],
      ['cp-c', 'Grand checkpoint', 10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 34],
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
    expect(unitOf(12)).toBeUndefined();
  });
});
