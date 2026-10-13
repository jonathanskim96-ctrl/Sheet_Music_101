import { useEffect, useRef, useState } from 'react';
import { useToast } from '../app/toasts';
import { navigate } from '../app/router';
import { KEYBOARD_UNLOCKED, TOASTS } from '../domain/content';
import { dayKeyOf } from '../domain/days';
import { UNITS, pathLessons } from '../domain/curriculum';
import { backupReminderDue, installCardSnoozed } from '../domain/nudges';
import { planFlag } from '../domain/planners';
import { lessonsDoneToday } from '../domain/progress';
import {
  MAX_UNIT_M4,
  currentPlayableLesson,
  isCompleted,
  isPlayable,
  isReviewPlayable,
  keyboardUnlocked,
  levelsPlayable,
  unitLevel,
  unitLevelCount,
} from '../domain/unlocks';
import { useExportBackup } from '../data/backupHooks';
import { useCommit, useLoadedProgress, useNow, useProgress } from '../data/ProgressContext';
import { Keyboard } from '../notation/Keyboard';
import { canOfferInstall, promptInstall, useInstallInfo } from '../pwa/install';
import { BackupReminderCard } from '../ui/BackupReminderCard';
import { Button } from '../ui/Button';
import { DailyGoalRing } from '../ui/DailyGoalRing';
import { BarChart3, CalendarDays, Music, Settings, Star } from '../ui/icons';
import { InstallCard } from '../ui/InstallCard';
import { LessonBubble, type BubbleState } from '../ui/LessonBubble';
import { Sheet } from '../ui/Sheet';
import { StatusBanner } from '../ui/StatusBanner';
import { UnitHeader } from '../ui/UnitHeader';
import styles from './PathScreen.module.css';

// "Later" on the backup reminder hides it until the app is opened again (owner decision 2026-10-13).
let backupReminderHidden = false;

/** The one card shown above the path, in the SPEC 7.2 priority order. */
function PathCard() {
  const state = useProgress();
  const progress = useLoadedProgress();
  const now = useNow();
  const commit = useCommit();
  const toast = useToast();
  const install = useInstallInfo();
  const exportBackup = useExportBackup();
  const [backupHidden, setBackupHidden] = useState(backupReminderHidden);
  const today = dayKeyOf(now());

  // Storage warning and save error come first; StatusBanner shows whichever applies.
  if (state.status === 'unavailable' || (state.status === 'ready' && state.saveError !== null)) {
    return <StatusBanner />;
  }
  if (canOfferInstall(install) && !installCardSnoozed(progress, today)) {
    return (
      <InstallCard
        ios={install.ios}
        canPrompt={install.canPrompt}
        onInstall={() => {
          promptInstall().catch((e: unknown) => {
            toast(
              `Something went wrong: ${e instanceof Error ? e.message : 'unknown error'}`,
              'error',
            );
          });
        }}
        onDismiss={() => {
          void commit((p) => planFlag(p, 'installCardDismissedDay', today));
        }}
      />
    );
  }
  if (!backupHidden && backupReminderDue(progress, today)) {
    return (
      <BackupReminderCard
        onSave={() => {
          void exportBackup();
        }}
        onLater={() => {
          backupReminderHidden = true;
          setBackupHidden(true);
        }}
      />
    );
  }
  return null;
}

/** "New: piano keyboard!" once the keyboard unlocks (only when levels 2–3 are playable, M6). */
function KeyboardUnlockedSheet() {
  const progress = useLoadedProgress();
  const commit = useCommit();
  const open = levelsPlayable() && keyboardUnlocked(progress) && !progress.flags.keyboardUnlockSeen;
  const dismiss = () => {
    void commit((p) => planFlag(p, 'keyboardUnlockSeen', true));
  };
  return (
    <Sheet open={open} title={KEYBOARD_UNLOCKED.title} onClose={dismiss}>
      <Keyboard from="C4" to="B4" ariaLabel="Piano keyboard" />
      <p>{KEYBOARD_UNLOCKED.body}</p>
      <Button fullWidth onClick={dismiss}>
        {KEYBOARD_UNLOCKED.button}
      </Button>
    </Sheet>
  );
}

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

      <PathCard />

      <main className={styles['path']}>
        {isReviewPlayable(progress) && (
          <div className={styles['practise']}>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                navigate({ name: 'review' });
              }}
            >
              <Music size={22} aria-hidden="true" />
              Practise
            </Button>
          </div>
        )}
        {UNITS.filter((u) => u.n <= MAX_UNIT_M4).map((unit) => (
          <section key={unit.n} className={styles['unit']} aria-label={`Unit ${String(unit.n)}`}>
            <UnitHeader
              n={unit.n}
              title={unit.title}
              subtitle={unit.subtitle}
              color={unit.color}
              stars={{ level: unitLevel(progress, unit.n), max: unitLevelCount(unit.n) }}
            />
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
      <KeyboardUnlockedSheet />
    </div>
  );
}
