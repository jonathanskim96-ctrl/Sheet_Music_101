import { describe, expect, it } from 'vitest';
import { emptyProgress, type Progress } from './progress';
import { backupReminderDue, installCardSnoozed, lastBackupText } from './nudges';
import { deepFreeze } from './testkit';

function withFlags(patch: Partial<Progress['flags']>, lessonsDone = 0): Progress {
  const p = emptyProgress('2026-09-01');
  return deepFreeze({
    ...p,
    flags: { ...p.flags, ...patch },
    totals: { ...p.totals, lessonsDone },
  });
}

describe('installCardSnoozed', () => {
  it('is false when never dismissed', () => {
    expect(installCardSnoozed(withFlags({}), '2026-10-14')).toBe(false);
  });
  it('lasts 7 days from "Not now"', () => {
    const p = withFlags({ installCardDismissedDay: '2026-10-07' });
    expect(installCardSnoozed(p, '2026-10-07')).toBe(true);
    expect(installCardSnoozed(p, '2026-10-13')).toBe(true);
    expect(installCardSnoozed(p, '2026-10-14')).toBe(false);
  });
});

describe('backupReminderDue', () => {
  it('waits for 5 lessons', () => {
    expect(backupReminderDue(withFlags({}, 4), '2026-10-14')).toBe(false);
    expect(backupReminderDue(withFlags({}, 5), '2026-10-14')).toBe(true);
  });
  it('stays away for 30 days after a backup', () => {
    const p = withFlags({ lastExportDay: '2026-09-14' }, 20);
    expect(backupReminderDue(p, '2026-10-13')).toBe(false);
    expect(backupReminderDue(p, '2026-10-14')).toBe(true);
  });
});

describe('lastBackupText', () => {
  it.each([
    [null, 'never'],
    ['2026-10-14', 'today'],
    ['2026-10-13', '1 day ago'],
    ['2026-10-04', '10 days ago'],
    ['2026-10-20', 'today'], // clock went backwards
  ] as const)('%s → %s', (day, text) => {
    expect(lastBackupText(withFlags({ lastExportDay: day }), '2026-10-14')).toBe(text);
  });
});
