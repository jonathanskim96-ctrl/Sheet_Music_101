import { CURRENT_SCHEMA_VERSION } from './progress';

export type UpgradeResult =
  { ok: true; value: unknown } | { ok: false; reason: 'newer' | 'unknown' };

export type UpgradeStep = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * Steps `vN → vN+1`, keyed by N. Append only: never edit or remove a step, because documents
 * saved by older versions of the app must keep loading.
 */
export const UPGRADE_STEPS: Readonly<Record<number, UpgradeStep>> = {
  // v1 → v2 (2026-10, course part 2): no field changes; the bump stops older app versions
  // from loading (and dropping) the new sharp/flat cards. Never edit this step.
  1: (raw) => ({ ...raw, schemaVersion: 2 }),
};

function schemaVersionOf(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const v: unknown = Object.hasOwn(raw, 'schemaVersion')
    ? (raw as Record<string, unknown>)['schemaVersion']
    : undefined;
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 ? v : null;
}

/** The step machinery, parameterised so tests can exercise future versions. */
export function upgradeWith(
  raw: unknown,
  current: number,
  steps: Readonly<Record<number, UpgradeStep>>,
): UpgradeResult {
  const version = schemaVersionOf(raw);
  if (version === null) return { ok: false, reason: 'unknown' };
  if (version > current) return { ok: false, reason: 'newer' };
  let value = raw as Record<string, unknown>;
  for (let v = version; v < current; v++) {
    const step = Object.hasOwn(steps, v) ? steps[v] : undefined;
    if (!step) return { ok: false, reason: 'unknown' };
    value = step(value);
  }
  return { ok: true, value };
}

/** Brings any saved document up to the current schema version (still unvalidated). */
export function upgradeToCurrent(raw: unknown): UpgradeResult {
  return upgradeWith(raw, CURRENT_SCHEMA_VERSION, UPGRADE_STEPS);
}
