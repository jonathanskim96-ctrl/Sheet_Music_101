import { daysBetween, type DayKey } from './days';

export type Box = 1 | 2 | 3 | 4 | 5;

export interface CardState {
  box: Box;
  lastSeenDay: DayKey;
  lastPromotedDay: DayKey | null;
  seen: number; // first-attempt answers counted
  correct: number; // first-attempt correct answers
  avgMs: number; // integer, exponential moving average of answer time
}

export const INTERVAL_DAYS: Record<Box, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 };
export const SLOW_MS = 6000;

/** Clamps a duration to 0..60000 ms and rounds it to an integer. */
function clampMs(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.min(60_000, Math.max(0, Math.round(ms)));
}

/** Leitner step for one first-attempt answer; returns a new state. */
export function updateCard(
  prev: CardState | undefined,
  correct: boolean,
  ms: number,
  today: DayKey,
): CardState {
  const base: CardState = prev ?? {
    box: 1,
    lastSeenDay: today,
    lastPromotedDay: null,
    seen: 0,
    correct: 0,
    avgMs: clampMs(ms),
  };
  const next: CardState = {
    ...base,
    seen: base.seen + 1,
    correct: base.correct + (correct ? 1 : 0),
    avgMs: prev ? Math.round(0.7 * prev.avgMs + 0.3 * clampMs(ms)) : clampMs(ms),
  };
  if (correct && ms <= SLOW_MS && base.lastPromotedDay !== today) {
    next.box = Math.min(5, base.box + 1) as Box;
    next.lastPromotedDay = today;
  } else if (!correct) {
    next.box = Math.max(1, base.box - 2) as Box;
  }
  next.lastSeenDay = today;
  return next;
}

/** True when the card's review interval has elapsed. */
export function isDue(c: CardState, today: DayKey): boolean {
  return daysBetween(c.lastSeenDay, today) >= INTERVAL_DAYS[c.box];
}

export type Mastery = 'new' | 'learning' | 'almost' | 'known';

/** Coarse mastery label used by the progress chart. */
export function masteryOf(c: CardState | undefined): Mastery {
  if (!c) return 'new';
  if (c.box <= 2) return 'learning';
  if (c.box === 3) return 'almost';
  return 'known';
}
