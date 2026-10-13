import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from './progress';
import { UPGRADE_STEPS, upgradeToCurrent, upgradeWith, type UpgradeStep } from './upgrades';
import { checkProgress } from './validate';
import { deepFreeze, sampleProgress } from './testkit';

// Every saved-document fixture ever shipped (tests/fixtures/*.json); fixtures are never edited.
const fixtures = import.meta.glob<unknown>('../../tests/fixtures/progress-v*.json', {
  eager: true,
  import: 'default',
});

describe('upgradeToCurrent', () => {
  it('v1 has no steps yet', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(Object.keys(UPGRADE_STEPS)).toEqual([]);
  });
  it('passes a current document through unchanged', () => {
    const doc = deepFreeze(JSON.parse(JSON.stringify(sampleProgress())) as unknown);
    const r = upgradeToCurrent(doc);
    expect(r).toEqual({ ok: true, value: doc });
  });
  it('says "newer" for a document from a later app version', () => {
    expect(upgradeToCurrent({ schemaVersion: 2 })).toEqual({ ok: false, reason: 'newer' });
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
  it('finds at least the v1 fixture', () => {
    expect(entries.map(([path]) => path.split('/').pop())).toContain('progress-v1.json');
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
    const p = checkProgress(fixtures['../../tests/fixtures/progress-v1.json'], 'strict').progress;
    expect(p).not.toBeNull();
    expect(p?.xp).toBe(135);
    expect(p?.daysPracticed).toHaveLength(9);
    expect(Object.keys(p?.cards ?? {})).toHaveLength(12);
    expect(p?.flags.lastExportDay).not.toBeNull();
    for (const id of ['u1-l1', 'u1-l4', 'u2-l3', 'u3-l4']) expect(p?.lessons[id]).toBeDefined();
  });
});
