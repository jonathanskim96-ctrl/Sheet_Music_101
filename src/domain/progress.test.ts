import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, emptyProgress, lessonsDoneToday } from './progress';

describe('emptyProgress', () => {
  it('has the documented defaults', () => {
    expect(emptyProgress('2026-10-12')).toEqual({
      schemaVersion: 2,
      createdDay: '2026-10-12',
      settings: { soundOn: true, dailyGoal: 1 },
      xp: 0,
      lessons: {},
      cards: {},
      daysPracticed: [],
      today: { day: '2026-10-12', lessonsDone: 0 },
      flags: {
        welcomeSeen: false,
        keyboardUnlockSeen: false,
        installCardDismissedDay: null,
        lastExportDay: null,
      },
      totals: { questionsAnswered: 0, correctFirstTry: 0, reviewsDone: 0, lessonsDone: 0 },
    });
  });
  it('matches the current schema version', () => {
    expect(emptyProgress('2026-10-12').schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
  it('returns independent objects each call', () => {
    const a = emptyProgress('2026-10-12');
    const b = emptyProgress('2026-10-12');
    a.lessons['x'] = {
      timesCompleted: 1,
      bestAccuracy: 1,
      firstCompletedDay: 'd',
      lastCompletedDay: 'd',
    };
    expect(b.lessons).toEqual({});
  });
});

describe('lessonsDoneToday', () => {
  it('counts only for the stored day', () => {
    const p = { ...emptyProgress('2026-10-12'), today: { day: '2026-10-12', lessonsDone: 2 } };
    expect(lessonsDoneToday(p, '2026-10-12')).toBe(2);
    expect(lessonsDoneToday(p, '2026-10-13')).toBe(0);
  });
});
