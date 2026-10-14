import type { BackupSummary } from '../domain/backup';
import { IMPORT_PREVIEW, importSavedOn, importSummaryLine } from '../domain/content';
import type { Progress } from '../domain/progress';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import styles from './SettingsScreen.module.css';

/** A backup the learner chose, checked and waiting for their decision. */
export interface Incoming {
  progress: Progress;
  summary: BackupSummary;
}

/** "13 October 2026" in the learner's own date style. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** The "Restore from backup" preview: what the file holds, and the choice to replace or not. */
export function ImportPreviewSheet({
  incoming,
  onClose,
  onSaveFirst,
  onReplace,
}: {
  incoming: Incoming | null;
  onClose: () => void;
  onSaveFirst: () => void;
  onReplace: (next: Progress) => void;
}) {
  return (
    <Sheet open={incoming !== null} title={IMPORT_PREVIEW.title} onClose={onClose}>
      {incoming && (
        <div data-testid="import-preview">
          {incoming.summary.exportedAt !== null && (
            <p>{importSavedOn(formatDate(incoming.summary.exportedAt))}</p>
          )}
          <p className={styles['summary']} data-testid="import-summary">
            {importSummaryLine(
              incoming.summary.xp,
              incoming.summary.lessonsCompleted,
              incoming.summary.daysPracticed,
            )}
          </p>
          <p className={styles['warning']}>{IMPORT_PREVIEW.warning}</p>
          <div className={styles['buttons']}>
            <Button variant="secondary" fullWidth onClick={onSaveFirst}>
              {IMPORT_PREVIEW.saveFirst}
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                onReplace(incoming.progress);
              }}
            >
              {IMPORT_PREVIEW.replace}
            </Button>
            <Button variant="ghost" fullWidth onClick={onClose}>
              {IMPORT_PREVIEW.cancel}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
