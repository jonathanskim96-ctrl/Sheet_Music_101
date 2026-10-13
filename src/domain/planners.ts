import { dayKeyOf, type DayKey } from './days';
import { CHECKPOINTS, pathLessons } from './curriculum';
import { emptyProgress, type LessonRecord, type Progress } from './progress';
import type { SessionResult } from './session';
import { updateCard } from './srs';

const MAX_INT = 1_000_000_000;
const MAX_DAYS = 50_000;
const XP_LESSON = 10;
const XP_PERFECT = 5;
const XP_CHECKPOINT_PASSED = 20;

const cap = (n: number): number => Math.min(MAX_INT, Math.max(0, Math.trunc(n)));

/** Adds (or updates) the record for a lesson or checkpoint that was just completed. */
function upsertLesson(
  lessons: Progress['lessons'],
  id: string,
  accuracy: number,
  today: DayKey,
): Progress['lessons'] {
  const prev = Object.hasOwn(lessons, id) ? lessons[id] : undefined;
  const acc = Math.min(100, Math.max(0, Math.round(accuracy)));
  const next: LessonRecord = prev
    ? {
        timesCompleted: cap(prev.timesCompleted + 1),
        bestAccuracy: Math.max(prev.bestAccuracy, acc),
        firstCompletedDay: prev.firstCompletedDay,
        lastCompletedDay: today,
      }
    : { timesCompleted: 1, bestAccuracy: acc, firstCompletedDay: today, lastCompletedDay: today };
  return { ...lessons, [id]: next };
}

/** `days` plus `today`, ascending and unique. */
function withDay(days: readonly DayKey[], today: DayKey): DayKey[] {
  if (days.includes(today)) return [...days];
  const all = [...days, today].sort();
  return all.length > MAX_DAYS ? all.slice(all.length - MAX_DAYS) : all;
}

/** Applies a finished lesson, review or checkpoint: cards, XP, lesson records, days and totals. */
export function planCompleteSession(p: Progress, result: SessionResult, now: Date): Progress {
  const today = dayKeyOf(now);

  let cards = { ...p.cards };
  for (const a of result.firstAttempts) {
    if (a.card === null) continue;
    const prev = Object.hasOwn(cards, a.card) ? cards[a.card] : undefined;
    cards = { ...cards, [a.card]: updateCard(prev, a.correct, a.ms, today) };
  }

  const ctx = result.context;
  const passedCheckpoint = ctx.kind === 'checkpoint' && result.passed === true;
  const xp = cap(
    p.xp +
      XP_LESSON +
      (result.perfect ? XP_PERFECT : 0) +
      (passedCheckpoint ? XP_CHECKPOINT_PASSED : 0),
  );

  let lessons = p.lessons;
  if (ctx.kind === 'lesson') {
    lessons = upsertLesson(lessons, ctx.lessonId, result.accuracy, today);
  } else if (ctx.kind === 'checkpoint' && passedCheckpoint) {
    const cp = CHECKPOINTS.find((c) => c.id === ctx.id);
    lessons = upsertLesson(lessons, ctx.id, result.accuracy, today);
    if (cp) {
      for (const l of pathLessons()) {
        if (cp.completesUnits.includes(l.unit) && !Object.hasOwn(lessons, l.id)) {
          lessons = {
            ...lessons,
            [l.id]: {
              timesCompleted: 0,
              bestAccuracy: 0,
              firstCompletedDay: today,
              lastCompletedDay: today,
            },
          };
        }
      }
    }
  }

  const rolled = p.today.day === today ? p.today : { day: today, lessonsDone: 0 };
  return {
    ...p,
    xp,
    cards,
    lessons,
    daysPracticed: withDay(p.daysPracticed, today),
    today: { day: rolled.day, lessonsDone: cap(rolled.lessonsDone + 1) },
    totals: {
      questionsAnswered: cap(p.totals.questionsAnswered + result.total),
      correctFirstTry: cap(p.totals.correctFirstTry + result.correctFirstTry),
      reviewsDone: cap(p.totals.reviewsDone + (ctx.kind === 'review' ? 1 : 0)),
      lessonsDone: cap(p.totals.lessonsDone + 1),
    },
  };
}

/** Changes sound and/or the daily goal. */
export function planSettings(p: Progress, patch: Partial<Progress['settings']>): Progress {
  return { ...p, settings: { ...p.settings, ...patch } };
}

/** Sets one of the small flags (welcome seen, install card dismissed, ...). */
export function planFlag<K extends keyof Progress['flags']>(
  p: Progress,
  flag: K,
  value: Progress['flags'][K],
): Progress {
  return { ...p, flags: { ...p.flags, [flag]: value } };
}

/** Records that a backup was saved today. */
export function planMarkExported(p: Progress, today: DayKey): Progress {
  return planFlag(p, 'lastExportDay', today);
}

/** Import: the incoming (already validated) document replaces everything. */
export function planReplaceAll(_p: Progress, incoming: Progress): Progress {
  return incoming;
}

/** Start over: a brand-new document dated `today`. */
export function planReset(_p: Progress, today: DayKey): Progress {
  return emptyProgress(today);
}
