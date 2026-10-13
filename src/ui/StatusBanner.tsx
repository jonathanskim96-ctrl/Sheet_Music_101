import { TOASTS, saveFailedText } from '../domain/content';
import { useProgress, useRetrySave } from '../data/ProgressContext';
import { Button } from './Button';
import styles from './StatusBanner.module.css';

/**
 * Warnings about saving: the browser won't store progress at all, or the last save failed.
 * Shown at the top of every screen while the problem lasts.
 */
export function StatusBanner() {
  const state = useProgress();
  const retry = useRetrySave();
  if (state.status === 'unavailable') {
    return (
      <div className={styles['banner']} role="alert" data-testid="storage-warning">
        {TOASTS.storageUnavailable}
      </div>
    );
  }
  if (state.status === 'ready' && state.saveError !== null) {
    return (
      <div className={styles['banner']} role="alert" data-testid="save-error">
        <span>{saveFailedText(state.saveError)}</span>
        <Button variant="secondary" onClick={retry}>
          {TOASTS.tryAgain}
        </Button>
      </div>
    );
  }
  return null;
}
