import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  BACKUP_MESSAGES,
  MAX_BACKUP_CHARS,
  backupFileName,
  parseBackup,
  serializeBackup,
} from './backup';
import { emptyProgress, type Progress } from './progress';
import { clone, progressArb, sampleProgress } from './testkit';

const NOW = new Date(Date.UTC(2026, 9, 12, 20, 15, 0));
const FIXED = new Set<string>(Object.values(BACKUP_MESSAGES));
const good = (): string => serializeBackup(sampleProgress(), NOW);
const edit = (fn: (o: Record<string, unknown>) => void): string => {
  const o = JSON.parse(good()) as Record<string, unknown>;
  fn(o);
  return JSON.stringify(o);
};
const failure = (text: string): string => {
  const r = parseBackup(text);
  if (r.ok) throw new Error('expected failure');
  return r.message;
};

describe('serializeBackup / backupFileName', () => {
  it('writes the documented envelope as 2-space pretty JSON', () => {
    const text = good();
    const o = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(o)).toEqual(['app', 'kind', 'schemaVersion', 'exportedAt', 'progress']);
    expect(o).toMatchObject({
      app: 'sheet-music-101',
      kind: 'backup',
      schemaVersion: 1,
      exportedAt: '2026-10-12T20:15:00.000Z',
    });
    expect(text).toBe(JSON.stringify(o, null, 2));
    expect(text.split('\n')[1]).toBe('  "app": "sheet-music-101",');
  });
  it('names the file with the local date', () => {
    expect(backupFileName(new Date(2026, 9, 12, 23, 59))).toBe(
      'sheet-music-101-backup-2026-10-12.json',
    );
    expect(backupFileName(new Date(2027, 0, 3, 0, 1))).toBe(
      'sheet-music-101-backup-2027-01-03.json',
    );
  });
  it('is small', () => {
    expect(good().length).toBeLessThan(10_000);
  });
});

describe('round trip', () => {
  it('export → parse gives back the same progress and a summary', () => {
    const p = sampleProgress();
    const r = parseBackup(serializeBackup(p, NOW));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress).toEqual(p);
    expect(r.summary).toEqual({
      xp: 135,
      lessonsCompleted: 1,
      daysPracticed: 3,
      cardsLearned: 2,
      exportedAt: '2026-10-12T20:15:00.000Z',
    });
  });
  it('property: any valid progress survives a round trip', () => {
    fc.assert(
      fc.property(progressArb, (p) => {
        const r = parseBackup(serializeBackup(p, NOW));
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.progress).toEqual(p);
      }),
      { numRuns: 100 },
    );
  });
  it('empty progress round-trips', () => {
    const p = emptyProgress('2026-10-12');
    const r = parseBackup(serializeBackup(p, NOW));
    expect(r.ok && r.progress).toEqual(p);
  });
  it('the summary does not count checkpoint records as lessons', () => {
    const p = sampleProgress();
    p.lessons['cp-a'] = clone(p.lessons['u1-l1'] as Progress['lessons'][string]);
    const r = parseBackup(serializeBackup(p, NOW));
    expect(r.ok && r.summary.lessonsCompleted).toBe(1);
  });
  it('the real v1 fixture shape is accepted', () => {
    expect(parseBackup(good()).ok).toBe(true);
  });
});

describe('failure messages', () => {
  it('too big: 1 000 001 characters is rejected without parsing (even if it would parse)', () => {
    const padded = good() + ' '.repeat(MAX_BACKUP_CHARS + 1 - good().length);
    expect(padded.length).toBe(1_000_001);
    expect(JSON.parse(padded)).toBeDefined(); // it really would have parsed
    expect(failure(padded)).toBe(BACKUP_MESSAGES.tooBig);
    expect(failure('x'.repeat(MAX_BACKUP_CHARS + 1))).toBe(BACKUP_MESSAGES.tooBig);
  });
  it('exactly 1 000 000 characters is still allowed', () => {
    const padded = good() + ' '.repeat(MAX_BACKUP_CHARS - good().length);
    expect(padded.length).toBe(1_000_000);
    expect(parseBackup(padded).ok).toBe(true);
  });
  it.each(['', 'not json', '{', '[1,2', 'undefined', '<html></html>', '{"a":'])(
    'text that is not JSON (%j) → "isn\'t a backup"',
    (t) => {
      expect(failure(t)).toBe(BACKUP_MESSAGES.notBackup);
    },
  );
  it.each(['null', '5', '"x"', '[]', '{}', 'true'])(
    'valid JSON of the wrong shape (%s) → "isn\'t a backup"',
    (t) => {
      expect(failure(t)).toBe(BACKUP_MESSAGES.notBackup);
    },
  );
  it('wrong app or kind → "isn\'t a backup"', () => {
    expect(failure(edit((o) => (o['app'] = 'other-app')))).toBe(BACKUP_MESSAGES.notBackup);
    expect(failure(edit((o) => (o['kind'] = 'export')))).toBe(BACKUP_MESSAGES.notBackup);
    expect(failure(edit((o) => delete o['app']))).toBe(BACKUP_MESSAGES.notBackup);
    expect(failure(edit((o) => delete o['kind']))).toBe(BACKUP_MESSAGES.notBackup);
  });
  it('a newer schemaVersion → the "update the app" message', () => {
    expect(BACKUP_MESSAGES.newer).toBe(
      'This backup is from a newer version of the app. Update the app first, then try again.',
    );
    expect(failure(edit((o) => (o['schemaVersion'] = 2)))).toBe(BACKUP_MESSAGES.newer);
    expect(
      failure(
        edit((o) => {
          (o['progress'] as Record<string, unknown>)['schemaVersion'] = 7;
        }),
      ),
    ).toBe(BACKUP_MESSAGES.newer);
  });
  it('missing or invalid progress → "damaged"', () => {
    expect(failure(edit((o) => delete o['progress']))).toBe(BACKUP_MESSAGES.damaged);
    expect(failure(edit((o) => (o['progress'] = 'x')))).toBe(BACKUP_MESSAGES.damaged);
    expect(failure(edit((o) => (o['progress'] = null)))).toBe(BACKUP_MESSAGES.damaged);
    expect(failure(edit((o) => (o['progress'] = [])))).toBe(BACKUP_MESSAGES.damaged);
    expect(
      failure(edit((o) => ((o['progress'] as Record<string, unknown>)['schemaVersion'] = 'one'))),
    ).toBe(BACKUP_MESSAGES.damaged);
  });
  it('a document with any strict-validation problem is rejected whole (never repaired)', () => {
    const bad: ((p: Record<string, unknown>) => void)[] = [
      (p) => (p['xp'] = 3.7),
      (p) => (p['xp'] = '5'),
      (p) => (p['xp'] = -1),
      (p) => ((p['settings'] as Record<string, unknown>)['dailyGoal'] = 9),
      (p) => (p['daysPracticed'] = ['2026-10-02', '2026-10-01']),
      (p) => (p['cards'] = { 'treble-C2': {} }),
      (p) => (p['createdDay'] = '2026-02-30'),
      (p) => {
        delete p['lessons'];
      },
    ];
    for (const fn of bad) {
      const text = edit((o) => {
        fn(o['progress'] as Record<string, unknown>);
      });
      expect(failure(text)).toBe(BACKUP_MESSAGES.damaged);
    }
  });
  it('deeply nested garbage does not crash', () => {
    expect(failure('['.repeat(200_000))).toBe(BACKUP_MESSAGES.notBackup);
    expect(failure('{"a":'.repeat(50_000))).toBe(BACKUP_MESSAGES.notBackup);
  });
  it('prototype-pollution attempts are harmless', () => {
    const text = good().replace('"progress": {', '"__proto__": {"polluted": true}, "progress": {');
    parseBackup(text);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});

describe('exportedAt', () => {
  it('is normalised when valid and null when missing or malformed', () => {
    const at = (v: unknown): string | null => {
      const r = parseBackup(edit((o) => (o['exportedAt'] = v)));
      if (!r.ok) throw new Error(r.message);
      return r.summary.exportedAt;
    };
    expect(at('2026-10-12T20:15:00Z')).toBe('2026-10-12T20:15:00.000Z');
    expect(at('2026-10-12T20:15:00.5Z')).toBe('2026-10-12T20:15:00.500Z');
    expect(at('yesterday')).toBeNull();
    expect(at('2026-13-45T99:99:99Z')).toBeNull();
    expect(at('2026-02-30T00:00:00Z')).toBeNull(); // would roll to 2 March
    expect(at('2026-10-12T24:00:00Z')).toBeNull(); // would roll to the 13th
    expect(at(12345)).toBeNull();
    expect(at(null)).toBeNull();
    expect(at('<script>run()</script>')).toBeNull();
    const r = parseBackup(edit((o) => delete o['exportedAt']));
    expect(r.ok && r.summary.exportedAt).toBeNull();
  });
});

describe('never echoes input', () => {
  it('every failure message is one of the fixed strings and contains none of the input', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (s) => {
        const r = parseBackup(s);
        if (r.ok) return true;
        expect(FIXED.has(r.message)).toBe(true);
        return s.length < 4 || !r.message.includes(s);
      }),
      { numRuns: 300 },
    );
  });
  it('hostile text inside an otherwise valid-looking backup never reaches the messages or summary', () => {
    const evil = 'EVIL_PAYLOAD_<img src=x onerror=run()>';
    const variants = [
      edit((o) => (o['app'] = evil)),
      edit((o) => (o['kind'] = evil)),
      edit((o) => (o['progress'] = { schemaVersion: 1, createdDay: evil })),
      edit((o) => ((o['progress'] as Record<string, unknown>)['xp'] = evil)),
      edit((o) => (o['exportedAt'] = evil)),
      edit((o) => (o['extra'] = evil)),
    ];
    for (const text of variants) {
      const r = parseBackup(text);
      expect(JSON.stringify(r)).not.toContain('EVIL_PAYLOAD');
    }
  });
  it('arbitrary JSON values wrapped as a backup never throw', () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.jsonValue(), (a, b) => {
        const text = JSON.stringify({
          app: 'sheet-music-101',
          kind: 'backup',
          schemaVersion: a,
          exportedAt: b,
          progress: b,
        });
        const r = parseBackup(text);
        if (!r.ok) expect(FIXED.has(r.message)).toBe(true);
        return true;
      }),
      { numRuns: 200 },
    );
  });
});
