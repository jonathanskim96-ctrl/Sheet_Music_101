import {
  CHECKPOINTS,
  UNITS,
  findLesson,
  levelLessons,
  pathLessons,
  type LessonDef,
} from './curriculum';
import type { Progress } from './progress';

/** True when the lesson (or checkpoint) has a record. Own keys only: 'constructor' is not "done". */
export function isCompleted(p: Progress, id: string): boolean {
  return Object.hasOwn(p.lessons, id);
}

/** The piano keyboard unlocks once the last treble-staff lesson (u4-l5) is done or skipped by cp-a. */
export function keyboardUnlocked(p: Progress): boolean {
  return isCompleted(p, 'u4-l5');
}

const PATH: readonly LessonDef[] = pathLessons();

function allCompleted(p: Progress, lessons: readonly LessonDef[]): boolean {
  return lessons.every((l) => isCompleted(p, l.id));
}

function level1Of(unit: number): LessonDef[] {
  return PATH.filter((l) => l.unit === unit);
}

/** Whether the learner may start this lesson or checkpoint (completed ones are always replayable). */
export function isAvailable(p: Progress, id: string): boolean {
  if (CHECKPOINTS.some((c) => c.id === id)) return true;
  const lesson = findLesson(id);
  if (!lesson) return false;
  if (isCompleted(p, id)) return true;
  if (lesson.level === 1) {
    const i = PATH.findIndex((l) => l.id === id);
    const prev = PATH[i - 1];
    return i === 0 || (prev !== undefined && isCompleted(p, prev.id));
  }
  if (lesson.level === 2) return keyboardUnlocked(p) && allCompleted(p, level1Of(lesson.unit));
  return allCompleted(p, levelLessons(lesson.unit, 2));
}

/** Highest fully completed level of a unit: 0 if level 1 is not done, else 1, 2 or 3. */
export function unitLevel(p: Progress, unit: number): 0 | 1 | 2 | 3 {
  if (!allCompleted(p, level1Of(unit)) || level1Of(unit).length === 0) return 0;
  const l2 = levelLessons(unit, 2);
  if (l2.length === 0 || !allCompleted(p, l2)) return 1;
  const l3 = levelLessons(unit, 3);
  return l3.length > 0 && allCompleted(p, l3) ? 3 : 2;
}

/** Whether a level (2 or 3) of a unit can be started (units 1 and 11 have none). */
export function isLevelAvailable(p: Progress, unit: number, level: 2 | 3): boolean {
  const first = levelLessons(unit, level)[0];
  return first !== undefined && isAvailable(p, first.id);
}

/** Review needs at least three cards the learner has met. */
export function reviewAvailable(p: Progress): boolean {
  return Object.keys(p.cards).length >= 3;
}

/** The next level-1 lesson to do: the first one that is available but not completed, or null. */
export function currentLesson(p: Progress): LessonDef | null {
  return PATH.find((l) => !isCompleted(p, l.id) && isAvailable(p, l.id)) ?? null;
}

/**
 * TODO(M6): remove this gate. Until the rest of the course is playable (M6), only the level-1
 * lessons of units 1–4 can be started.
 */
export const MAX_UNIT_M4 = 4;

/** Whether the lesson can be started in this build: available, level 1, and in units 1–MAX_UNIT_M4. */
export function isPlayable(p: Progress, id: string): boolean {
  const lesson = findLesson(id);
  return (
    lesson !== undefined && lesson.level === 1 && lesson.unit <= MAX_UNIT_M4 && isAvailable(p, id)
  );
}

/** TODO(M6): remove with the gate. The next playable level-1 lesson, or null. */
export function currentPlayableLesson(p: Progress): LessonDef | null {
  return PATH.find((l) => !isCompleted(p, l.id) && isPlayable(p, l.id)) ?? null;
}

/** How many levels a unit has: 3 for units with level-2/3 lessons, else 1 (units 1 and 11). */
export function unitLevelCount(unit: number): 1 | 3 {
  return levelLessons(unit, 2).length > 0 ? 3 : 1;
}

/**
 * TODO(M6): remove with the gate. Practice (review) is part of M6, so the "Practise" button and
 * `#/review` stay hidden until every unit is playable.
 */
export function isReviewPlayable(p: Progress): boolean {
  return MAX_UNIT_M4 >= UNITS.length && reviewAvailable(p);
}

/**
 * TODO(M6): remove with the gate. Levels 2–3 (and so the keyboard-unlocked message that points
 * to them) are playable only from M6.
 */
export function levelsPlayable(): boolean {
  return MAX_UNIT_M4 >= UNITS.length;
}
