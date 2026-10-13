import { useState } from 'react';
import { navigate } from '../app/router';
import { CHECKPOINTS, UNITS } from '../domain/curriculum';
import { unitLevel, unitLevelCount } from '../domain/unlocks';
import { useLoadedProgress } from '../data/ProgressContext';
import { Staff } from '../notation/Staff';
import { CalendarDays, Circle, CircleCheck, Sprout, Star, Trophy, TrendingUp } from '../ui/icons';
import { LevelStars } from '../ui/LevelStars';
import { ScreenHeader } from '../ui/ScreenHeader';
import { MASTERY_WORDS, chartNotes, overallAccuracy, type Mastery } from './progress/mastery';
import styles from './ProgressScreen.module.css';

const LEGEND: readonly { mastery: Mastery; Icon: typeof Circle }[] = [
  { mastery: 'new', Icon: Circle },
  { mastery: 'learning', Icon: Sprout },
  { mastery: 'almost', Icon: TrendingUp },
  { mastery: 'known', Icon: CircleCheck },
];

const CHECKPOINT_IDS: readonly string[] = CHECKPOINTS.map((c) => c.id);

/** Mastery chart, totals and level stars (SPEC 7.2). */
export function ProgressScreen() {
  const progress = useLoadedProgress();
  const [selected, setSelected] = useState<number | null>(null);
  const notes = chartNotes(progress);
  const accuracy = overallAccuracy(progress);
  const lessonsCompleted = Object.keys(progress.lessons).filter(
    (id) => !CHECKPOINT_IDS.includes(id),
  ).length;
  const chosen = selected === null ? undefined : notes[selected];

  return (
    <div className={styles['page']}>
      <ScreenHeader
        title="Progress"
        onBack={() => {
          navigate({ name: 'home' });
        }}
      />
      <main>
        <section aria-labelledby="mastery-title" className={styles['section']}>
          <h2 id="mastery-title">Notes you know</h2>
          <Staff
            mode="grand"
            columns={17}
            ariaLabel="Grand staff with every note of the course"
            notes={notes.map((n) => ({
              clef: n.clef,
              note: n.note,
              column: n.column,
              state: `mastery-${n.mastery}` as const,
            }))}
            noteTaps={{
              labels: notes.map((n) => n.label),
              selected,
              onTap: (i) => {
                setSelected((s) => (s === i ? null : i));
              },
            }}
          />
          <p className={styles['tooltip']} role="status" data-testid="mastery-tooltip">
            {chosen?.label ?? 'Tap a note to see how well you know it.'}
          </p>
          <ul className={styles['legend']} aria-label="Legend">
            {LEGEND.map(({ mastery, Icon }) => (
              <li key={mastery} className={styles['legendItem']}>
                <Icon size={20} aria-hidden="true" className={styles[mastery]} />
                {MASTERY_WORDS[mastery]}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Totals" className={styles['tiles']}>
          <div className={styles['tile']}>
            <Star size={22} aria-hidden="true" className={styles['xpIcon']} />
            <span className={styles['tileValue']} data-testid="total-xp">
              {progress.xp}
            </span>
            <span className={styles['tileLabel']}>Total XP</span>
          </div>
          <div className={styles['tile']}>
            <CalendarDays size={22} aria-hidden="true" />
            <span className={styles['tileValue']} data-testid="total-days">
              {progress.daysPracticed.length}
            </span>
            <span className={styles['tileLabel']}>Days practised</span>
          </div>
          <div className={styles['tile']}>
            <Trophy size={22} aria-hidden="true" />
            <span className={styles['tileValue']} data-testid="total-lessons">
              {lessonsCompleted}
            </span>
            <span className={styles['tileLabel']}>Lessons completed</span>
          </div>
          <div className={styles['tile']}>
            <CircleCheck size={22} aria-hidden="true" />
            <span className={styles['tileValue']} data-testid="total-accuracy">
              {accuracy === null ? '–' : `${String(accuracy)}%`}
            </span>
            <span className={styles['tileLabel']}>First-try accuracy</span>
          </div>
        </section>

        <section aria-labelledby="units-title" className={styles['section']}>
          <h2 id="units-title">Units</h2>
          <ul className={styles['units']}>
            {UNITS.map((u) => (
              <li key={u.n} className={styles['unit']}>
                <span className={styles['unitDot']} style={{ background: `var(${u.color})` }}>
                  {u.n}
                </span>
                <span className={styles['unitTitle']}>{u.title}</span>
                <LevelStars level={unitLevel(progress, u.n)} max={unitLevelCount(u.n)} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
