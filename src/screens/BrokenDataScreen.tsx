import { useEffect, useState } from 'react';
import { useExportRaw, useReadRawSaved, useStartFresh } from '../data/backupHooks';
import { Button } from '../ui/Button';
import { Mascot } from '../ui/Mascot';
import { StartOverSheets } from '../ui/StartOverSheets';
import styles from './BrokenDataScreen.module.css';

type Raw =
  | { status: 'reading' }
  | { status: 'read'; value: unknown }
  | { status: 'failed'; message: string };

/**
 * Saved progress exists but can't be read (SPEC 7.2). Nothing is changed unless the learner
 * confirms "Start fresh" twice; the stored data can be downloaded first, exactly as it is.
 */
export function BrokenDataScreen({ reason }: { reason: string }) {
  const readRaw = useReadRawSaved();
  const exportRaw = useExportRaw();
  const startFresh = useStartFresh();
  const [raw, setRaw] = useState<Raw>({ status: 'reading' });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read it now, so the download button can open the share sheet straight from the tap.
  useEffect(() => {
    let live = true;
    readRaw().then(
      (value) => {
        if (live) setRaw({ status: 'read', value });
      },
      (e: unknown) => {
        if (live)
          setRaw({ status: 'failed', message: e instanceof Error ? e.message : 'Unknown error' });
      },
    );
    return () => {
      live = false;
    };
  }, [readRaw]);

  const download = (): Promise<boolean> => {
    if (raw.status !== 'read') return Promise.resolve(false);
    return exportRaw(raw.value);
  };

  return (
    <main className={styles['page']} data-testid="broken-screen">
      <Mascot mood="encouraging" size={96} />
      <h1>We couldn't read your saved progress.</h1>
      <p className={styles['text']}>
        {/[.!?]$/.test(reason) ? reason : `${reason}.`} Nothing has been changed or deleted.
      </p>
      {raw.status === 'failed' && (
        <p className={styles['error']} role="alert">
          The saved data can't be downloaded: {raw.message}
        </p>
      )}
      {error !== null && (
        <p className={styles['error']} role="alert">
          {error}
        </p>
      )}
      <div className={styles['buttons']}>
        <Button
          fullWidth
          disabled={raw.status !== 'read'}
          onClick={() => {
            void download();
          }}
        >
          Download the saved data
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            window.location.reload();
          }}
        >
          Try again
        </Button>
        <Button
          variant="danger"
          fullWidth
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          Start fresh
        </Button>
      </div>
      <StartOverSheets
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        onSaveBackup={download}
        saveUnavailable={
          raw.status === 'read'
            ? null
            : raw.status === 'failed'
              ? `The saved data can't be downloaded: ${raw.message}`
              : ''
        }
        onErase={async () => {
          const r = await startFresh();
          if (!r.ok) setError(`Something went wrong: ${r.message}`);
        }}
      />
    </main>
  );
}
