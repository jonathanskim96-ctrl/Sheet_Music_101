import { BACKUP_REMINDER } from '../domain/content';
import { Button } from './Button';
import { Upload } from './icons';
import styles from './NudgeCard.module.css';

export interface BackupReminderCardProps {
  onSave: () => void;
  onLater: () => void;
}

/** "Save a backup" reminder on the Path (≥ 5 lessons and no backup in 30 days). */
export function BackupReminderCard({ onSave, onLater }: BackupReminderCardProps) {
  return (
    <section
      className={styles['card']}
      data-testid="backup-reminder"
      aria-labelledby="backup-title"
    >
      <div className={styles['head']}>
        <Upload size={28} aria-hidden="true" className={styles['icon']} />
        <h2 id="backup-title" className={styles['title']}>
          {BACKUP_REMINDER.title}
        </h2>
      </div>
      <p className={styles['body']}>{BACKUP_REMINDER.body}</p>
      <div className={styles['buttons']}>
        <Button onClick={onSave}>{BACKUP_REMINDER.save}</Button>
        <Button variant="ghost" onClick={onLater}>
          {BACKUP_REMINDER.later}
        </Button>
      </div>
    </section>
  );
}
