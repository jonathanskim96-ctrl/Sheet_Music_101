import {
  CHECKPOINTS,
  findLesson,
  levelLessons,
  pathLessons,
  type CheckpointDef,
  type LessonDef,
} from './curriculum';
import { isCardId } from './cards';
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

/**
 * The lesson a "Level 2"/"Level 3" button opens: the first lesson of that level not completed
 * yet, or lesson a when both are done. Null when the unit has no such level.
 */
export function nextLevelLesson(p: Progress, unit: number, level: 2 | 3): LessonDef | null {
  const lessons = levelLessons(unit, level);
  return lessons.find((l) => !isCompleted(p, l.id)) ?? lessons[0] ?? null;
}

/** True once the learner has finished the unit before the checkpoint ("Test yourself", else "Jump ahead"). */
export function checkpointReached(p: Progress, cp: CheckpointDef): boolean {
  return allCompleted(p, level1Of(cp.afterUnit));
}

/** Review needs at least three cards the learner has met (sharp and flat cards count, SPEC 8.9). */
export function reviewAvailable(p: Progress): boolean {
  return Object.keys(p.cards).filter((id) => isCardId(id)).length >= 3;
}

/** The next level-1 lesson to do: the first one that is available but not completed, or null. */
export function currentLesson(p: Progress): LessonDef | null {
  return PATH.find((l) => !isCompleted(p, l.id) && isAvailable(p, l.id)) ?? null;
}

/** How many levels a unit has: 3 for units with level-2/3 lessons, else 1 (units 1 and 11). */
export function unitLevelCount(unit: number): 1 | 3 {
  return levelLessons(unit, 2).length > 0 ? 3 : 1;
}
