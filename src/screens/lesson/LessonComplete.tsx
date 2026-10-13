import { useEffect, useRef, useState } from 'react';
import { navigate } from '../../app/router';
import { LESSON_COMPLETE } from '../../domain/content';
import { dayKeyOf } from '../../domain/days';
import { planCompleteSession } from '../../domain/planners';
import { lessonsDoneToday, type Progress } from '../../domain/progress';
import type { SessionResult } from '../../domain/session';
import { synth } from '../../audio/synth';
import { useCommit, useNow, useProgress } from '../../data/ProgressContext';
import { Button } from '../../ui/Button';
import { Confetti } from '../../ui/Confetti';
import { Mascot } from '../../ui/Mascot';
import styles from './lesson.module.css';

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;

function mmss(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, '0')}`;
}

function titleFor(result: SessionResult): string {
  const kind = result.context.kind;
  if (kind === 'review') return LESSON_COMPLETE.titleReview;
  if (kind === 'checkpoint') {
    return result.passed === true
      ? LESSON_COMPLETE.titleCheckpointPassed
      : LESSON_COMPLETE.titleCheckpointFailed;
  }
  return result.perfect ? LESSON_COMPLETE.titlePerfect : LESSON_COMPLETE.titleNormal;
}

export interface LessonCompleteProps {
  result: SessionResult;
  /** The progress as it was when the lesson began (before this result is saved). */
  before: Progress;
}

/** The end of a lesson. The result is saved as soon as this screen appears. */
export function LessonComplete({ result, before }: LessonCompleteProps) {
  const commit = useCommit();
  const now = useNow();
  const state = useProgress();
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const [mascotLine] = useState(() => pick(LESSON_COMPLETE.mascotLines));
  const [at] = useState(() => now());

  // What this result is worth, worked out the same way the saved change will be.
  const after = planCompleteSession(before, result, at);
  const today = dayKeyOf(at);
  const goal = before.settings.dailyGoal;
  const goalJustReached =
    lessonsDoneToday(before, today) < goal && lessonsDoneToday(after, today) >= goal;

  useEffect(() => {
    // Strict mode runs effects twice in development; the result must only be saved once.
    if (started.current) return;
    started.current = true;
    synth.playFanfare();
    void commit((p) => planCompleteSession(p, result, at)).then((r) => {
      setSaving(false);
      if (!r.ok) setError(r.message);
    });
  }, [commit, result, at]);

  const checkpointFailed = result.context.kind === 'checkpoint' && result.passed !== true;
  const line = checkpointFailed
    ? LESSON_COMPLETE.checkpointFailedLine
    : result.context.kind === 'checkpoint'
      ? LESSON_COMPLETE.checkpointPassedLine
      : result.perfect
        ? LESSON_COMPLETE.perfectLine
        : mascotLine;
  const saveFailed = state.status === 'ready' && state.saveError !== null;

  return (
    <>
      <Confetti />
      <div className={styles['content']} data-testid="lesson-complete">
        <Mascot mood="celebrating" size={160} />
        <h2 className={styles['completeTitle']}>{titleFor(result)}</h2>
        <p className={styles['cardBody']}>{line}</p>
        <dl className={styles['stats']}>
          <div className={styles['stat']}>
            <dt>{LESSON_COMPLETE.statLabels.xp}</dt>
            <dd data-testid="stat-xp">+{after.xp - before.xp}</dd>
          </div>
          <div className={styles['stat']}>
            <dt>{LESSON_COMPLETE.statLabels.accuracy}</dt>
            <dd data-testid="stat-accuracy">{result.accuracy}%</dd>
          </div>
          <div className={styles['stat']}>
            <dt>{LESSON_COMPLETE.statLabels.time}</dt>
            <dd>{mmss(result.durationMs)}</dd>
          </div>
          <div className={styles['stat']}>
            <dt>{LESSON_COMPLETE.statLabels.combo}</dt>
            <dd>{result.bestCombo}</dd>
          </div>
        </dl>
        {goalJustReached && (
          <p className={styles['goalBanner']} data-testid="goal-banner">
            {LESSON_COMPLETE.dailyGoalBanner}
          </p>
        )}
        {saving && (
          <p className={styles['saving']} role="status">
            Saving…
          </p>
        )}
        {error !== null && (
          <p className={styles['errorBanner']} role="alert">
            Something went wrong: {error}
          </p>
        )}
        {saveFailed && !saving && (
          <p className={styles['errorBanner']} role="alert">
            Your progress is not saved yet. Use "Try again" at the top.
          </p>
        )}
      </div>
      <div className={styles['bottom']}>
        <Button
          fullWidth
          onClick={() => {
            navigate({ name: 'home' });
          }}
        >
          Continue
        </Button>
      </div>
    </>
  );
}
