import { useEffect, useRef } from 'react';
import { useToast } from '../app/toasts';
import { navigate } from '../app/router';
import { TOASTS } from '../domain/content';
import { dayKeyOf } from '../domain/days';
import { UNITS, pathLessons } from '../domain/curriculum';
import { lessonsDoneToday } from '../domain/progress';
import { MAX_UNIT_M4, currentPlayableLesson, isCompleted, isPlayable } from '../domain/unlocks';
import { useLoadedProgress, useNow } from '../data/ProgressContext';
import { DailyGoalRing } from '../ui/DailyGoalRing';
import { BarChart3, CalendarDays, Settings, Star } from '../ui/icons';
import { LessonBubble, type BubbleState } from '../ui/LessonBubble';
import { UnitHeader } from '../ui/UnitHeader';
import styles from './PathScreen.module.css';

const ZIGZAG = [0, 48, 72, 48, 0, -48, -72, -48];
// The wave carries on from one unit to the next, so each lesson's place in the whole path decides its shift.
const PATH_INDEX = new Map(pathLessons().map((l, i) => [l.id, i]));

/** Home: the lesson path (units 1–4 for now), with XP, days practised and the daily goal on top. */
export function PathScreen() {
  const progress = useLoadedProgress();
  const now = useNow();
  const toast = useToast();
  const currentRef = useRef<HTMLButtonElement>(null);
  const current = currentPlayableLesson(progress);
  const today = dayKeyOf(now());

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div className={styles['page']}>
      <header className={styles['bar']}>
        <h1 className={styles['srOnly']}>Sheet Music 101</h1>
        <span className={styles['stat']} data-testid="xp">
          <Star size={22} aria-hidden="true" className={styles['xpIcon']} />
          <span className={styles['statText']}>
            <span data-testid="xp-value">{progress.xp}</span>
            <span className={styles['srOnly']}> XP</span>
          </span>
        </span>
        <span className={styles['stat']} data-testid="days">
          <CalendarDays size={22} aria-hidden="true" />
          <span className={styles['statText']}>
            <span data-testid="days-value">{progress.daysPracticed.length}</span>
            <span className={styles['srOnly']}> days practised</span>
          </span>
        </span>
        <span className={styles['spacer']} />
        <DailyGoalRing
          done={lessonsDoneToday(progress, today)}
          goal={progress.settings.dailyGoal}
        />
        <button
          type="button"
          className={styles['iconButton']}
          aria-label="Progress"
          onClick={() => {
            navigate({ name: 'progress' });
          }}
        >
          <BarChart3 size={24} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles['iconButton']}
          aria-label="Settings"
          onClick={() => {
            navigate({ name: 'settings' });
          }}
        >
          <Settings size={24} aria-hidden="true" />
        </button>
      </header>

      <main className={styles['path']}>
        {UNITS.filter((u) => u.n <= MAX_UNIT_M4).map((unit) => (
          <section key={unit.n} className={styles['unit']} aria-label={`Unit ${String(unit.n)}`}>
            <UnitHeader n={unit.n} title={unit.title} subtitle={unit.subtitle} color={unit.color} />
            {unit.lessons.map((lesson) => {
              const offset = ZIGZAG[(PATH_INDEX.get(lesson.id) ?? 0) % ZIGZAG.length] ?? 0;
              const isCurrent = current?.id === lesson.id;
              const state: BubbleState = isCompleted(progress, lesson.id)
                ? 'completed'
                : isCurrent
                  ? 'current'
                  : 'locked';
              return (
                <LessonBubble
                  key={lesson.id}
                  lessonId={lesson.id}
                  title={lesson.title}
                  state={state}
                  color={unit.color}
                  offset={offset}
                  bubbleRef={isCurrent ? currentRef : undefined}
                  onPress={() => {
                    if (isPlayable(progress, lesson.id)) {
                      navigate({ name: 'lesson', lessonId: lesson.id });
                    } else {
                      toast(TOASTS.lockedLesson);
                    }
                  }}
                />
              );
            })}
          </section>
        ))}
        <p className={styles['more']}>More units are coming soon.</p>
      </main>
    </div>
  );
}
