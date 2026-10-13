import type { CardId } from './cards';
import type { LessonId } from './curriculum';
import type { DayKey } from './days';
import type { CardState } from './srs';

export const CURRENT_SCHEMA_VERSION = 1;

export interface LessonRecord {
  timesCompleted: number; // 0 means "completed by passing a checkpoint" (skipped)
  bestAccuracy: number; // integer 0..100
  firstCompletedDay: DayKey;
  lastCompletedDay: DayKey;
}

export interface Progress {
  schemaVersion: 1;
  createdDay: DayKey;
  settings: { soundOn: boolean; dailyGoal: 1 | 2 | 3 };
  xp: number;
  lessons: Record<LessonId, LessonRecord>; // level-1, level-2/3 and checkpoint ids; never 'review'
  cards: Partial<Record<CardId, CardState>>; // only cards the learner has met
  daysPracticed: DayKey[]; // ascending, unique
  today: { day: DayKey; lessonsDone: number };
  flags: {
    welcomeSeen: boolean;
    keyboardUnlockSeen: boolean;
    installCardDismissedDay: DayKey | null;
    lastExportDay: DayKey | null;
  };
  totals: {
    questionsAnswered: number;
    correctFirstTry: number;
    reviewsDone: number;
    lessonsDone: number;
  };
}

/** A brand-new progress document for a learner who starts on `today`. */
export function emptyProgress(today: DayKey): Progress {
  return {
    schemaVersion: 1,
    createdDay: today,
    settings: { soundOn: true, dailyGoal: 1 },
    xp: 0,
    lessons: {},
    cards: {},
    daysPracticed: [],
    today: { day: today, lessonsDone: 0 },
    flags: {
      welcomeSeen: false,
      keyboardUnlockSeen: false,
      installCardDismissedDay: null,
      lastExportDay: null,
    },
    totals: { questionsAnswered: 0, correctFirstTry: 0, reviewsDone: 0, lessonsDone: 0 },
  };
}

/** Lessons finished on `today` (0 once the stored day has rolled over). */
export function lessonsDoneToday(p: Progress, today: DayKey): number {
  return p.today.day === today ? p.today.lessonsDone : 0;
}
