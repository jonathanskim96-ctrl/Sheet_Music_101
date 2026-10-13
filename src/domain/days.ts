export type DayKey = string; // 'YYYY-MM-DD', the learner's LOCAL date

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The local calendar date of `now` as a DayKey. */
export function dayKeyOf(now: Date): DayKey {
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True for a well-formed string that is also a real calendar date. */
export function isDayKey(s: unknown): s is DayKey {
  if (typeof s !== 'string') return false;
  const m = DAY_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  const t = new Date(Date.UTC(y, mo - 1, d));
  // Date.UTC maps years 0..99 to 1900..1999, so compare via setUTCFullYear.
  t.setUTCFullYear(y);
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

function utcDay(k: DayKey): number {
  const [y = 0, m = 1, d = 1] = k.split('-').map(Number);
  const t = new Date(Date.UTC(2000, m - 1, d));
  t.setUTCFullYear(y);
  return Math.round(t.getTime() / 86_400_000);
}

/** Whole days from a to b (negative if b is earlier). DST-proof: uses UTC. */
export function daysBetween(a: DayKey, b: DayKey): number {
  return utcDay(b) - utcDay(a);
}
