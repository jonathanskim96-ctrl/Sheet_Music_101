import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from './progress';
import { UPGRADE_STEPS, upgradeToCurrent, upgradeWith, type UpgradeStep } from './upgrades';
import { checkProgress } from './validate';
import { clone, deepFreeze, progressArb, sampleProgress } from './testkit';
import fc from 'fast-check';

// Every saved-document fixture ever shipped (tests/fixtures/*.json); fixtures are never edited.
const fixtures = import.meta.glob<unknown>('../../tests/fixtures/progress-v*.json', {
  eager: true,
  import: 'default',
});

describe('upgradeToCurrent', () => {
  it('the current version is 2 and its only step is v1 → v2', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(Object.keys(UPGRADE_STEPS)).toEqual(['1']);
  });
  it('passes a current document through unchanged', () => {
    const doc = deepFreeze(JSON.parse(JSON.stringify(sampleProgress())) as unknown);
    const r = upgradeToCurrent(doc);
    expect(r).toEqual({ ok: true, value: doc });
  });
  it('says "newer" for a document from a later app version', () => {
    expect(upgradeToCurrent({ schemaVersion: 3 })).toEqual({ ok: false, reason: 'newer' });
    expect(upgradeToCurrent({ schemaVersion: 99 })).toEqual({ ok: false, reason: 'newer' });
  });
  it.each([
    null,
    undefined,
    5,
    'x',
    [],
    {},
    { schemaVersion: 0 },
    { schemaVersion: -1 },
    { schemaVersion: 1.5 },
    { schemaVersion: '1' },
    { schemaVersion: null },
    { schemaVersion: Number.NaN },
  ])('says "unknown" for %j', (v) => {
    expect(upgradeToCurrent(v)).toEqual({ ok: false, reason: 'unknown' });
  });
  it('does not read an inherited schemaVersion', () => {
    const child: object = Object.create({ schemaVersion: 1 }) as object;
    expect(upgradeToCurrent(child)).toEqual({ ok: false, reason: 'unknown' });
  });
});

describe('upgradeWith (machinery, using pretend future versions)', () => {
  const v1to2: UpgradeStep = (raw) => ({ ...raw, schemaVersion: 2, added: 'two' });
  const v2to3: UpgradeStep = (raw) => ({ ...raw, schemaVersion: 3, extra: 'three' });
  it('applies the steps in order, from any older version', () => {
    const steps = { 1: v1to2, 2: v2to3 };
    expect(upgradeWith({ schemaVersion: 1, keep: 1 }, 3, steps)).toEqual({
      ok: true,
      value: { schemaVersion: 3, keep: 1, added: 'two', extra: 'three' },
    });
    expect(upgradeWith({ schemaVersion: 2, keep: 1 }, 3, steps)).toEqual({
      ok: true,
      value: { schemaVersion: 3, keep: 1, extra: 'three' },
    });
    expect(upgradeWith({ schemaVersion: 3 }, 3, steps)).toEqual({
      ok: true,
      value: { schemaVersion: 3 },
    });
  });
  it('does not mutate its input', () => {
    const input = deepFreeze({ schemaVersion: 1, keep: 1 });
    expect(() => upgradeWith(input, 2, { 1: v1to2 })).not.toThrow();
  });
  it('fails as "unknown" when a step is missing, and "newer" above current', () => {
    expect(upgradeWith({ schemaVersion: 1 }, 3, { 2: v2to3 })).toEqual({
      ok: false,
      reason: 'unknown',
    });
    expect(upgradeWith({ schemaVersion: 4 }, 3, { 1: v1to2, 2: v2to3 })).toEqual({
      ok: false,
      reason: 'newer',
    });
  });
});

describe('fixtures (SPEC 6.5)', () => {
  const entries = Object.entries(fixtures);
  it('finds the v1 and v2 fixtures', () => {
    const names = entries.map(([path]) => path.split('/').pop());
    expect(names).toContain('progress-v1.json');
    expect(names).toContain('progress-v2.json');
  });
  it.each(entries)(
    '%s upgrades and strict-validates, keeping xp, lessons and cards',
    (_path, raw) => {
      const up = upgradeToCurrent(raw);
      expect(up.ok).toBe(true);
      if (!up.ok) return;
      const strict = checkProgress(up.value, 'strict');
      expect(strict.issues).toEqual([]);
      expect(strict.progress).not.toBeNull();
      const original = raw as {
        xp: number;
        lessons: Record<string, unknown>;
        cards: Record<string, unknown>;
        daysPracticed: string[];
      };
      expect(strict.progress?.xp).toBe(original.xp);
      expect(strict.progress?.lessons).toEqual(original.lessons);
      expect(strict.progress?.cards).toEqual(original.cards);
      expect(strict.progress?.daysPracticed).toEqual(original.daysPracticed);
      // repair mode agrees: nothing to fix
      expect(checkProgress(up.value, 'repair').issues).toEqual([]);
    },
  );
  it('progress-v1.json is the realistic mid-course document the plan describes', () => {
    const up = upgradeToCurrent(fixtures['../../tests/fixtures/progress-v1.json']);
    const p = up.ok ? checkProgress(up.value, 'strict').progress : null;
    expect(p).not.toBeNull();
    expect(p?.xp).toBe(135);
    expect(p?.daysPracticed).toHaveLength(9);
    expect(Object.keys(p?.cards ?? {})).toHaveLength(12);
    expect(p?.flags.lastExportDay).not.toBeNull();
    for (const id of ['u1-l1', 'u1-l4', 'u2-l3', 'u3-l4']) expect(p?.lessons[id]).toBeDefined();
  });
});

const V1_PATH = '../../tests/fixtures/progress-v1.json';
const V2_PATH = '../../tests/fixtures/progress-v2.json';

describe('schema v2 (SCHEMA-V2 §5)', () => {
  it('test 1: the v1 fixture upgrades, validates strictly with no issues, and keeps every field', () => {
    const v1 = fixtures[V1_PATH] as Record<string, unknown>;
    const up = upgradeToCurrent(v1);
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    expect((up.value as Record<string, unknown>)['schemaVersion']).toBe(2);
    const strict = checkProgress(up.value, 'strict');
    expect(strict.issues).toEqual([]);
    expect(strict.progress?.schemaVersion).toBe(2);
    const after: Record<string, unknown> = { ...strict.progress };
    expect({ ...after, schemaVersion: 0 }).toEqual({ ...v1, schemaVersion: 0 });
    for (const key of [
      'xp',
      'lessons',
      'cards',
      'daysPracticed',
      'today',
      'flags',
      'settings',
      'totals',
    ])
      expect(after[key]).toEqual(v1[key]);
  });

  it('test 2: the v2 fixture strict-validates and keeps its sign cards and the u26-l1 record', () => {
    const v2 = fixtures[V2_PATH] as {
      cards: Record<string, unknown>;
      lessons: Record<string, unknown>;
    };
    const strict = checkProgress(v2, 'strict');
    expect(strict.issues).toEqual([]);
    for (const id of ['treble-F#4', 'treble-Bb4', 'bass-C#3'])
      expect(strict.progress?.cards[id as 'treble-F#4']).toEqual(v2.cards[id]);
    expect(strict.progress?.lessons['u26-l1']).toEqual(v2.lessons['u26-l1']);
    for (const id of ['u12-l1', 'u12-l2', 'cp-d', 'u13-l1', 'u14-l1', 'u15-l1'])
      expect(strict.progress?.lessons[id]).toEqual(v2.lessons[id]);
    expect(upgradeToCurrent(v2)).toEqual({ ok: true, value: v2 });
  });

  it('test 3: the v1 → v2 step does not mutate its input and returns a new object', () => {
    const input = deepFreeze(clone(fixtures[V1_PATH]) as Record<string, unknown>);
    const step = UPGRADE_STEPS[1];
    expect(step).toBeDefined();
    const out = step?.(input);
    expect(out).not.toBe(input);
    expect(out?.['schemaVersion']).toBe(2);
    expect(input['schemaVersion']).toBe(1);
    expect(Object.keys(out ?? {})).toEqual(Object.keys(input));
  });

  it('test 4: hostile v1 input upgrades without polluting Object.prototype; repair drops junk, strict reports it', () => {
    const text = JSON.stringify(fixtures[V1_PATH]).replace(
      '"cards":{',
      '"cards":{"__proto__":{"polluted":1},"constructor":{"box":1},"treble-Z9":{"box":1},',
    );
    const hostile = JSON.parse(
      text.replace('"settings":{', '"settings":{"__proto__":{"polluted":2},'),
    ) as unknown;
    const up = upgradeToCurrent(hostile);
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.getPrototypeOf(up.value)).toBe(Object.prototype);
    const repaired = checkProgress(up.value, 'repair');
    expect(repaired.progress).not.toBeNull();
    expect(Object.keys(repaired.progress?.cards ?? {})).not.toContain('treble-Z9');
    expect(Object.keys(repaired.progress?.cards ?? {})).not.toContain('constructor');
    expect(repaired.issues.length).toBeGreaterThan(0);
    expect(checkProgress(repaired.progress, 'strict').issues).toEqual([]);
    expect(checkProgress(up.value, 'strict').progress).toBeNull();
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('test 5: version 3 stays refused, and a simulated older app (v1) refuses a v2 document', () => {
    expect(upgradeToCurrent({ ...(clone(fixtures[V2_PATH]) as object), schemaVersion: 3 })).toEqual(
      {
        ok: false,
        reason: 'newer',
      },
    );
    // An older copy of the app has CURRENT = 1 and no steps: it must answer "newer", never load.
    expect(upgradeWith(fixtures[V2_PATH], 1, {})).toEqual({ ok: false, reason: 'newer' });
    expect(upgradeWith(fixtures[V1_PATH], 1, {})).toEqual({ ok: true, value: fixtures[V1_PATH] });
  });

  it('test 10 (property): random valid v1 documents upgrade, pass strict, and keep every field but schemaVersion', () => {
    fc.assert(
      fc.property(progressArb, (p) => {
        const v1 = { ...clone(p), schemaVersion: 1 } as Record<string, unknown>;
        const up = upgradeToCurrent(v1);
        expect(up.ok).toBe(true);
        if (!up.ok) return;
        const strict = checkProgress(up.value, 'strict');
        expect(strict.issues).toEqual([]);
        expect(strict.progress).toEqual({ ...v1, schemaVersion: 2 });
      }),
      { numRuns: 100 },
    );
  });
});
