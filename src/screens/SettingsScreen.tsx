import { useEffect, useRef, useState } from 'react';
import { navigate } from '../app/router';
import { useToast } from '../app/toasts';
import { INSTALL_CARD, SILENT_HINT, somethingWentWrong } from '../domain/content';
import { dayKeyOf } from '../domain/days';
import { lastBackupText } from '../domain/nudges';
import { planReset, planSettings } from '../domain/planners';
import { useExportBackup, useReplaceProgress } from '../data/backupHooks';
import { readBackupFile } from '../data/files';
import { isPersisted } from '../data/persist';
import { useCommit, useLoadedProgress, useNow } from '../data/ProgressContext';
import { promptInstall, useInstallInfo } from '../pwa/install';
import { isIosDevice } from '../pwa/platform';
import { Button } from '../ui/Button';
import { ScreenHeader } from '../ui/ScreenHeader';
import { ImportPreviewSheet, type Incoming } from './ImportPreviewSheet';
import { StartOverSheets } from '../ui/StartOverSheets';
import styles from './SettingsScreen.module.css';

const GOALS = [1, 2, 3] as const;

/** Sound, daily goal, install help, backups, storage status, start over, about (SPEC 7.2). */
export function SettingsScreen() {
  const progress = useLoadedProgress();
  const commit = useCommit();
  const now = useNow();
  const toast = useToast();
  const install = useInstallInfo();
  const exportBackup = useExportBackup();
  const replaceProgress = useReplaceProgress();
  const fileInput = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [startOver, setStartOver] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const today = dayKeyOf(now());

  useEffect(() => {
    let live = true;
    void isPersisted().then((p) => {
      if (live) setPersisted(p);
    });
    return () => {
      live = false;
    };
  }, []);

  const onFileChosen = (file: File | undefined) => {
    if (!file) return;
    readBackupFile(file).then(
      (result) => {
        if (result.ok) setIncoming({ progress: result.progress, summary: result.summary });
        else toast(result.message, 'error');
      },
      (e: unknown) => {
        toast(somethingWentWrong(e), 'error');
      },
    );
  };

  return (
    <div className={styles['page']}>
      <ScreenHeader
        title="Settings"
        onBack={() => {
          navigate({ name: 'home' });
        }}
      />
      <main>
        <section className={styles['section']} aria-labelledby="sound-title">
          <div className={styles['row']}>
            <h2 id="sound-title" className={styles['heading']}>
              Sound
            </h2>
            <button
              type="button"
              role="switch"
              aria-checked={progress.settings.soundOn}
              aria-labelledby="sound-title"
              className={styles['switch']}
              data-testid="sound-switch"
              onClick={() => {
                // Flip the latest value, so two quick taps cancel out.
                void commit((p) => planSettings(p, { soundOn: !p.settings.soundOn }));
              }}
            >
              <span className={styles['knob']} />
            </button>
          </div>
          {isIosDevice() && (
            <p className={styles['muted']} data-testid="settings-silent-hint">
              {SILENT_HINT}
            </p>
          )}
        </section>

        <section className={styles['section']} aria-labelledby="goal-title">
          <h2 id="goal-title" className={styles['heading']}>
            Daily goal
          </h2>
          <div className={styles['segments']} role="group" aria-labelledby="goal-title">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                className={styles['segment']}
                aria-pressed={progress.settings.dailyGoal === g}
                aria-label={`${String(g)} ${g === 1 ? 'lesson' : 'lessons'} a day`}
                onClick={() => {
                  void commit((p) => planSettings(p, { dailyGoal: g }));
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        <section className={styles['section']} aria-labelledby="install-title">
          <h2 id="install-title" className={styles['heading']}>
            Install the app
          </h2>
          {install.standalone ? (
            <p className={styles['text']}>The app is installed.</p>
          ) : install.ios ? (
            <p className={styles['text']}>
              {INSTALL_CARD.body} {INSTALL_CARD.iosExtra}
            </p>
          ) : install.canPrompt ? (
            <>
              <p className={styles['text']}>{INSTALL_CARD.body}</p>
              <Button
                onClick={() => {
                  promptInstall().catch((e: unknown) => {
                    toast(somethingWentWrong(e), 'error');
                  });
                }}
              >
                {INSTALL_CARD.install}
              </Button>
            </>
          ) : (
            <p className={styles['text']}>
              Use your browser&apos;s menu to add this app to your home screen.
            </p>
          )}
        </section>

        <section className={styles['section']} aria-labelledby="backup-title">
          <h2 id="backup-title" className={styles['heading']}>
            Backup
          </h2>
          <p className={styles['text']} data-testid="last-backup">
            Last backup: {lastBackupText(progress, today)}
          </p>
          <div className={styles['buttons']}>
            <Button
              fullWidth
              onClick={() => {
                void exportBackup();
              }}
            >
              Save a backup
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                fileInput.current?.click();
              }}
            >
              Restore from backup
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-input"
            onChange={(e) => {
              onFileChosen(e.currentTarget.files?.[0]);
              // The same file can be chosen again after a Cancel.
              e.currentTarget.value = '';
            }}
          />
        </section>

        <section className={styles['section']} aria-labelledby="storage-title">
          <h2 id="storage-title" className={styles['heading']}>
            Storage
          </h2>
          <p className={styles['text']} data-testid="storage-status">
            {persisted === null
              ? '…'
              : persisted
                ? 'Protected'
                : 'Not protected yet. Installing the app helps.'}
          </p>
        </section>

        <section className={styles['section']} aria-labelledby="reset-title">
          <h2 id="reset-title" className={styles['heading']}>
            Start over
          </h2>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              setStartOver(true);
            }}
          >
            Start over
          </Button>
        </section>

        <section className={styles['section']} aria-labelledby="about-title">
          <h2 id="about-title" className={styles['heading']}>
            About
          </h2>
          <p className={styles['muted']} data-testid="about-version">
            Sheet Music 101 version {__APP_VERSION__} (build {__BUILD_ID__})
          </p>
          <p className={styles['muted']}>
            Music symbols: Bravura by Steinberg, SIL Open Font License
          </p>
        </section>
      </main>

      <ImportPreviewSheet
        incoming={incoming}
        onClose={() => {
          setIncoming(null);
        }}
        onSaveFirst={() => {
          // Offer an export before anything is replaced (CLAUDE.md); the preview stays open.
          void exportBackup();
        }}
        onReplace={(next) => {
          setIncoming(null);
          void replaceProgress(next);
        }}
      />

      <StartOverSheets
        open={startOver}
        onClose={() => {
          setStartOver(false);
        }}
        onSaveBackup={exportBackup}
        onErase={async () => {
          await commit((p) => planReset(p, dayKeyOf(now())));
        }}
      />
    </div>
  );
}
