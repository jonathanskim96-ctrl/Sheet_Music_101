import { useState } from 'react';
import { START_OVER } from '../domain/content';
import { Button } from './Button';
import { Sheet } from './Sheet';
import styles from './StartOverSheets.module.css';

export interface StartOverSheetsProps {
  open: boolean;
  onClose: () => void;
  /** "Save backup" on the first sheet; resolves true when a file was saved. */
  onSaveBackup: () => Promise<boolean>;
  /** Set while "Save backup" can't work; a non-empty text is shown on the first sheet. */
  saveUnavailable?: string | null;
  /** "Erase everything" on the second sheet. */
  onErase: () => Promise<void>;
}

/**
 * The two-step confirmation before progress is erased (SPEC 6.1): offer a backup first, then
 * ask once more. Cancel at either step erases nothing.
 */
export function StartOverSheets({
  open,
  onClose,
  onSaveBackup,
  saveUnavailable = null,
  onErase,
}: StartOverSheetsProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const close = () => {
    setStep(1);
    onClose();
  };
  return (
    <>
      <Sheet open={open && step === 1} title={START_OVER.step1.title} onClose={close}>
        <p>{START_OVER.step1.body}</p>
        {saveUnavailable !== null && saveUnavailable !== '' && (
          <p className={styles['problem']} role="alert">
            {saveUnavailable}
          </p>
        )}
        <div className={styles['buttons']}>
          <Button
            fullWidth
            disabled={busy || saveUnavailable !== null}
            onClick={() => {
              setBusy(true);
              void onSaveBackup().then((saved) => {
                setBusy(false);
                if (saved) setStep(2);
              });
            }}
          >
            {START_OVER.step1.save}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setStep(2);
            }}
          >
            {START_OVER.step1.skip}
          </Button>
          <Button variant="ghost" fullWidth onClick={close}>
            {START_OVER.step1.cancel}
          </Button>
        </div>
      </Sheet>
      <Sheet open={open && step === 2} title={START_OVER.step2.title} onClose={close}>
        <p>{START_OVER.step2.body}</p>
        <div className={styles['buttons']}>
          <Button
            variant="danger"
            fullWidth
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onErase().finally(() => {
                setBusy(false);
                close();
              });
            }}
          >
            {START_OVER.step2.erase}
          </Button>
          <Button variant="ghost" fullWidth onClick={close}>
            {START_OVER.step2.cancel}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
