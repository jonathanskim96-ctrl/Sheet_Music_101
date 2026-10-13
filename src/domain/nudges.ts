import { daysBetween, type DayKey } from './days';
import type { Progress } from './progress';

/** The InstallCard stays away for 7 days after "Not now" (SPEC 7.2). */
export const INSTALL_SNOOZE_DAYS = 7;
/** Backup reminder: after this many lessons, when there was no backup in the last 30 days. */
export const BACKUP_REMINDER_LESSONS = 5;
export const BACKUP_REMINDER_DAYS = 30;

/** True while "Not now" on the InstallCard is less than 7 days old. */
export function installCardSnoozed(p: Progress, today: DayKey): boolean {
  const day = p.flags.installCardDismissedDay;
  return day !== null && daysBetween(day, today) < INSTALL_SNOOZE_DAYS;
}

/** At least 5 lessons done and no backup saved in the last 30 days. */
export function backupReminderDue(p: Progress, today: DayKey): boolean {
  if (p.totals.lessonsDone < BACKUP_REMINDER_LESSONS) return false;
  const last = p.flags.lastExportDay;
  return last === null || daysBetween(last, today) >= BACKUP_REMINDER_DAYS;
}

/** "never", "today", "yesterday"… for Settings → "Last backup: …". */
export function lastBackupText(p: Progress, today: DayKey): string {
  const last = p.flags.lastExportDay;
  if (last === null) return 'never';
  const d = daysBetween(last, today);
  if (d <= 0) return 'today';
  return d === 1 ? '1 day ago' : `${String(d)} days ago`;
}
