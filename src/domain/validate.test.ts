import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { checkProgress } from './validate';
import { emptyProgress } from './progress';
import { clone, deepFreeze, progressArb, sampleProgress } from './testkit';

type Doc = Record<string, unknown>;
const doc = (): Doc => clone(sampleProgress()) as unknown as Doc;
const strict = (raw: unknown) => checkProgress(raw, 'strict');
const repair = (raw: unknown) => checkProgress(raw, 'repair');

/** Creates an own property even for the key '__proto__' (plain assignment would change the prototype). */
function setOwn(o: object, key: string, value: unknown): void {
  Object.defineProperty(o, key, { value, enumerable: true, writable: true, configurable: true });
}

/** Sets a nested value on a copy of the sample document. */
function withPath(path: (string | number)[], value: unknown): Doc {
  const d = doc();
  let o: Record<string, unknown> = d;
  for (const k of path.slice(0, -1)) o = o[String(k)] as Record<string, unknown>;
  o[String(path[path.length - 1])] = value;
  return d;
}
function without(path: string[]): Doc {
  const d = doc();
  let o: Record<string, unknown> = d;
  for (const k of path.slice(0, -1)) o = o[k] as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete o[path[path.length - 1] ?? ''];
  return d;
}

describe('valid documents', () => {
  it('passes both modes unchanged with no issues', () => {
    for (const mode of ['strict', 'repair'] as const) {
      const r = checkProgress(doc(), mode);
      expect(r.issues).toEqual([]);
      expect(r.progress).toEqual(sampleProgress());
    }
  });
  it('empty progress is valid', () => {
    const p = emptyProgress('2026-10-12');
    expect(strict(p).progress).toEqual(p);
  });
  it('returns a fresh object, never the input, and does not mutate frozen input', () => {
    const frozen = deepFreeze(doc());
    const r = strict(frozen);
    expect(r.progress).not.toBe(frozen);
    expect(r.progress?.lessons).not.toBe(frozen['lessons']);
    expect(r.progress?.cards).not.toBe(frozen['cards']);
  });
  it('ignores and drops unknown top-level and nested keys', () => {
    const d = doc();
    d['extra'] = { evil: 1 };
    (d['settings'] as Doc)['theme'] = 'pink';
    ((d['lessons'] as Doc)['u1-l1'] as Doc)['note'] = 'hi';
    const r = strict(d);
    expect(r.progress).toEqual(sampleProgress());
    expect(JSON.stringify(r.progress)).not.toContain('evil');
  });
  it('keeps unknown-but-well-formed lesson ids (forward compatibility)', () => {
    const d = doc();
    (d['lessons'] as Doc)['u12-l1'] = clone(sampleProgress().lessons['u1-l1']);
    expect(strict(d).progress?.lessons['u12-l1']).toBeDefined();
  });
  it('property: every generated valid document passes strict unchanged', () => {
    fc.assert(
      fc.property(progressArb, (p) => {
        const r = strict(JSON.parse(JSON.stringify(p)));
        expect(r.issues).toEqual([]);
        expect(r.progress).toEqual(p);
      }),
      { numRuns: 100 },
    );
  });
});

describe('top level', () => {
  it.each([null, undefined, 5, 'x', true, [], [1, 2], new Date(0), new Map(), () => 1])(
    'rejects a non-plain-object top level in both modes',
    (v) => {
      expect(strict(v).progress).toBeNull();
      expect(repair(v).progress).toBeNull();
      expect(strict(v).issues.length).toBeGreaterThan(0);
    },
  );
  it.each([0, 2, '1', null, undefined, 1.5, true])(
    'schemaVersion %j is fatal in both modes',
    (v) => {
      const d = doc();
      d['schemaVersion'] = v;
      expect(strict(d).progress).toBeNull();
      expect(repair(d).progress).toBeNull();
    },
  );
  it('a missing schemaVersion is fatal', () => {
    expect(strict(without(['schemaVersion'])).progress).toBeNull();
    expect(repair(without(['schemaVersion'])).progress).toBeNull();
  });
});

describe('numeric rule (SPEC 4.7)', () => {
  it('xp: 3.7 is rejected in strict and becomes 3 in repair', () => {
    const d = withPath(['xp'], 3.7);
    const s = strict(d);
    expect(s.progress).toBeNull();
    expect(s.issues.join(' ')).toContain('xp');
    const r = repair(d);
    expect(r.progress?.xp).toBe(3);
    expect(r.issues.length).toBeGreaterThan(0);
  });
  it('xp: "5" becomes 0 in repair and is rejected in strict', () => {
    const d = withPath(['xp'], '5');
    expect(strict(d).progress).toBeNull();
    expect(repair(d).progress?.xp).toBe(0);
  });
  it.each([
    [-5, 0],
    [1e12, 1_000_000_000],
    [1e300, 1_000_000_000],
    [-0.5, 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [null, 0],
    [undefined, 0],
    [{}, 0],
    [[5], 0],
    [true, 0],
    [1_000_000_000, 1_000_000_000],
    [0, 0],
  ])('xp %j: repair gives %j', (input, expected) => {
    const r = repair(withPath(['xp'], input));
    expect(r.progress?.xp).toBe(expected);
    expect(Object.is(r.progress?.xp, -0)).toBe(false);
  });
  it('xp: -0 is accepted but normalised', () => {
    const r = strict(withPath(['xp'], -0));
    expect(Object.is(r.progress?.xp, 0)).toBe(true);
  });
  it('xp: 1 000 000 001 is rejected in strict (just above the cap)', () => {
    expect(strict(withPath(['xp'], 1_000_000_001)).progress).toBeNull();
  });
  it('numeric ranges: bestAccuracy 0..100, avgMs 0..60000, box 1..5, dailyGoal 1..3', () => {
    const bad: [string[], unknown, unknown][] = [
      [['lessons', 'u1-l1', 'bestAccuracy'], 101, 100],
      [['lessons', 'u1-l1', 'bestAccuracy'], -1, 0],
      [['cards', 'treble-C4', 'avgMs'], 60_001, 60_000],
      [['cards', 'treble-C4', 'avgMs'], -1, 0],
      [['cards', 'treble-C4', 'box'], 6, 5],
      [['cards', 'treble-C4', 'box'], 0, 1],
      [['cards', 'treble-C4', 'box'], 'x', 1],
      [['settings', 'dailyGoal'], 4, 3],
      [['settings', 'dailyGoal'], 0, 1],
      [['settings', 'dailyGoal'], '2', 1],
      [['settings', 'dailyGoal'], 2.9, 2],
      [['totals', 'lessonsDone'], -3, 0],
      [['today', 'lessonsDone'], 2.5, 2],
    ];
    for (const [path, input, fixed] of bad) {
      const d = withPath(path, input);
      expect(strict(d).progress, `${path.join('.')}=${String(input)} strict`).toBeNull();
      const r = repair(d);
      let v: unknown = r.progress;
      for (const k of path) v = (v as Record<string, unknown>)[k];
      expect(v, `${path.join('.')}=${String(input)} repair`).toBe(fixed);
    }
  });
  it('card.correct above seen: strict rejects, repair sets it to seen', () => {
    const d = withPath(['cards', 'treble-C4', 'correct'], 99);
    expect(strict(d).progress).toBeNull();
    expect(repair(d).progress?.cards['treble-C4']?.correct).toBe(8);
  });
  it('correct equal to seen is fine', () => {
    expect(strict(withPath(['cards', 'treble-C4', 'correct'], 8)).progress).not.toBeNull();
  });
});

describe('scalar and date rules', () => {
  it('rejects bad soundOn / flags in strict; repair uses the defaults', () => {
    const r = repair(withPath(['settings', 'soundOn'], 'yes'));
    expect(r.progress?.settings.soundOn).toBe(true);
    expect(strict(withPath(['settings', 'soundOn'], 1)).progress).toBeNull();
    expect(repair(withPath(['flags', 'welcomeSeen'], 'x')).progress?.flags.welcomeSeen).toBe(false);
    expect(strict(withPath(['flags', 'keyboardUnlockSeen'], null)).progress).toBeNull();
  });
  it.each(['2026-02-29', '2026-13-01', '2026-1-01', 20261012, '', 'today'])(
    'invalid date %j: strict rejects each date field',
    (v) => {
      for (const path of [
        ['createdDay'],
        ['today', 'day'],
        ['lessons', 'u1-l1', 'firstCompletedDay'],
        ['lessons', 'u1-l1', 'lastCompletedDay'],
        ['cards', 'treble-C4', 'lastSeenDay'],
        ['cards', 'treble-C4', 'lastPromotedDay'],
        ['flags', 'installCardDismissedDay'],
        ['flags', 'lastExportDay'],
      ]) {
        expect(strict(withPath(path, v)).progress, path.join('.')).toBeNull();
      }
    },
  );
  it('nullable dates accept null in both modes', () => {
    const d = withPath(['flags', 'installCardDismissedDay'], null);
    expect(strict(d).progress?.flags.installCardDismissedDay).toBeNull();
    expect(
      strict(withPath(['cards', 'treble-C4', 'lastPromotedDay'], null)).progress,
    ).not.toBeNull();
  });
  it('repair: invalid nullable dates become null; invalid required dates become createdDay', () => {
    const r = repair(withPath(['flags', 'lastExportDay'], 'nope'));
    expect(r.progress?.flags.lastExportDay).toBeNull();
    const t = repair(withPath(['today', 'day'], 'nope'));
    expect(t.progress?.today.day).toBe('2026-10-01');
    const c = repair(withPath(['cards', 'treble-C4', 'lastSeenDay'], 5));
    expect(c.progress?.cards['treble-C4']?.lastSeenDay).toBe('2026-10-01');
    const l = repair(withPath(['lessons', 'u1-l1', 'firstCompletedDay'], null));
    expect(l.progress?.lessons['u1-l1']?.firstCompletedDay).toBe('2026-10-01');
  });
  it('repair: a bad createdDay is rebuilt from the earliest valid date in the document', () => {
    const r = repair(withPath(['createdDay'], 'bad'));
    expect(r.progress?.createdDay).toBe('2026-10-01');
  });
  it('repair: unreadable createdDay with no other date anywhere is not guessed (null)', () => {
    const d = doc();
    d['createdDay'] = 'bad';
    d['daysPracticed'] = [];
    d['lessons'] = {};
    d['cards'] = {};
    d['today'] = { day: 'bad', lessonsDone: 0 };
    expect(repair(d).progress).toBeNull();
    expect(strict(d).progress).toBeNull();
  });
  it('missing sections: strict rejects; repair restores defaults', () => {
    for (const k of [
      'settings',
      'today',
      'flags',
      'totals',
      'lessons',
      'cards',
      'daysPracticed',
      'xp',
    ]) {
      const d = without([k]);
      expect(strict(d).progress, `${k} strict`).toBeNull();
      expect(repair(d).progress, `${k} repair`).not.toBeNull();
    }
    expect(repair(without(['settings'])).progress?.settings).toEqual({
      soundOn: true,
      dailyGoal: 1,
    });
    expect(repair(withPath(['lessons'], 'x')).progress?.lessons).toEqual({});
    expect(repair(withPath(['flags'], [])).progress?.flags.welcomeSeen).toBe(false);
  });
});

describe('map rules', () => {
  const rec = () => clone(sampleProgress().lessons['u1-l1']);
  it.each(['U1-L1', 'u1_l1', 'has space', '', 'a'.repeat(33), 'ü', '__proto__', 'a.b'])(
    'lesson id %j is rejected in strict and dropped in repair',
    (id) => {
      const d = doc();
      setOwn(d['lessons'] as Doc, id, rec());
      expect(strict(d).progress).toBeNull();
      const r = repair(d);
      expect(Object.keys(r.progress?.lessons ?? {}).sort()).toEqual(['u1-l1']);
    },
  );
  it('accepts a 32-character lesson id and rejects a 33-character one', () => {
    const ok = doc();
    (ok['lessons'] as Doc)['a'.repeat(32)] = rec();
    expect(strict(ok).progress).not.toBeNull();
  });
  it('lesson values that are not objects are dropped in repair', () => {
    for (const v of [null, 5, 'x', [], [1]]) {
      const d = doc();
      (d['lessons'] as Doc)['u2-l1'] = v;
      expect(strict(d).progress).toBeNull();
      expect(Object.keys(repair(d).progress?.lessons ?? {})).toEqual(['u1-l1']);
    }
  });
  it('card ids must be real cards', () => {
    for (const id of ['treble-C2', 'alto-C4', 'bass-F5', '__proto__', 'constructor', '']) {
      const d = doc();
      setOwn(d['cards'] as Doc, id, clone(sampleProgress().cards['treble-C4']));
      expect(strict(d).progress, id).toBeNull();
      expect(Object.keys(repair(d).progress?.cards ?? {}).sort()).toEqual(['bass-F3', 'treble-C4']);
    }
  });
  it('rejects more than 1000 lesson entries in strict; repair keeps at most 1000', () => {
    const d = doc();
    const lessons: Record<string, unknown> = {};
    for (let i = 0; i < 1200; i++) lessons[`x-${String(i)}`] = rec();
    d['lessons'] = lessons;
    expect(strict(d).progress).toBeNull();
    expect(Object.keys(repair(d).progress?.lessons ?? {}).length).toBe(1000);
  });
});

describe('daysPracticed', () => {
  it('strict rejects unsorted, duplicated or invalid entries', () => {
    expect(strict(withPath(['daysPracticed'], ['2026-10-02', '2026-10-01'])).progress).toBeNull();
    expect(strict(withPath(['daysPracticed'], ['2026-10-01', '2026-10-01'])).progress).toBeNull();
    expect(strict(withPath(['daysPracticed'], ['2026-10-01', 'nope'])).progress).toBeNull();
    expect(strict(withPath(['daysPracticed'], 'x')).progress).toBeNull();
    expect(strict(withPath(['daysPracticed'], {})).progress).toBeNull();
  });
  it('repair drops invalid entries, sorts and dedupes', () => {
    const r = repair(
      withPath(
        ['daysPracticed'],
        ['2026-10-03', 'bad', '2026-10-01', '2026-10-03', 5, null, '2026-10-02'],
      ),
    );
    expect(r.progress?.daysPracticed).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });
  it('strict rejects more than 50 000 entries', () => {
    const many = Array.from(
      { length: 50_001 },
      (_, i) => `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
    );
    expect(strict(withPath(['daysPracticed'], many)).progress).toBeNull();
  });
  it('repair handles a 10 000-entry array of junk quickly', () => {
    const junk = Array.from({ length: 10_000 }, (_, i) => (i % 2 === 0 ? 'x' : i));
    const t = performance.now();
    const r = repair(withPath(['daysPracticed'], junk));
    expect(performance.now() - t).toBeLessThan(2000);
    expect(r.progress?.daysPracticed).toEqual([]);
  });
});

describe('issues', () => {
  it('lists at most 20 messages and never echoes input text', () => {
    const d = doc();
    const lessons: Record<string, unknown> = {};
    for (let i = 0; i < 100; i++) lessons[`SECRET_${String(i)}`] = 5;
    d['lessons'] = lessons;
    d['xp'] = 'TOPSECRET';
    const s = strict(d);
    expect(s.progress).toBeNull();
    expect(s.issues.length).toBeLessThanOrEqual(20);
    expect(s.issues.length).toBeGreaterThan(0);
    expect(JSON.stringify(s.issues)).not.toContain('SECRET');
    const r = repair(d);
    expect(r.issues.length).toBeLessThanOrEqual(20);
    expect(JSON.stringify(r.issues)).not.toContain('SECRET');
  });
  it('strict still lists the other problems when createdDay is bad', () => {
    const d = doc();
    d['createdDay'] = 'bad';
    d['xp'] = -1;
    (d['settings'] as Doc)['dailyGoal'] = 9;
    const s = strict(d);
    expect(s.progress).toBeNull();
    const text = s.issues.join(' | ');
    expect(text).toContain('createdDay');
    expect(text).toContain('xp');
    expect(text).toContain('settings.dailyGoal');
  });
  it('strict lists every distinct problem (up to the cap)', () => {
    const d = doc();
    d['xp'] = -1;
    (d['settings'] as Doc)['dailyGoal'] = 9;
    (d['flags'] as Doc)['welcomeSeen'] = 'x';
    const s = strict(d);
    expect(s.issues.length).toBe(3);
  });
});

describe('prototype pollution', () => {
  it('a __proto__ key inside lessons does not pollute Object.prototype', () => {
    const d = JSON.parse(
      JSON.stringify(sampleProgress()).replace(
        '"lessons":{',
        '"lessons":{"__proto__":{"polluted":true},',
      ),
    ) as Doc;
    expect(Object.keys(d['lessons'] as Doc)).toContain('__proto__');
    for (const mode of ['strict', 'repair'] as const) {
      const r = checkProgress(d, mode);
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
      if (r.progress) {
        expect(Object.getPrototypeOf(r.progress.lessons)).toBe(Object.prototype);
        expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
        expect(Object.hasOwn(r.progress.lessons, '__proto__')).toBe(false);
      }
    }
  });
  it('__proto__ at every level of the document is harmless', () => {
    const text = JSON.stringify(sampleProgress())
      .replace('{', '{"__proto__":{"polluted":1},')
      .replace('"settings":{', '"settings":{"__proto__":{"polluted":2},')
      .replace('"cards":{', '"cards":{"__proto__":{"polluted":3},')
      .replace('"flags":{', '"flags":{"constructor":{"prototype":{"polluted":4}},');
    const d: unknown = JSON.parse(text);
    repair(d);
    strict(d);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
  it('a lesson id of "constructor" is kept as a plain own property', () => {
    const d = doc();
    (d['lessons'] as Doc)['constructor'] = clone(sampleProgress().lessons['u1-l1']);
    const r = strict(d);
    expect(r.progress).not.toBeNull();
    expect(Object.hasOwn(r.progress?.lessons ?? {}, 'constructor')).toBe(true);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(typeof ({} as { constructor: unknown }).constructor).toBe('function');
  });
  it('inherited properties are never read (only own keys count)', () => {
    const proto = { xp: 999 };
    const child = Object.create(proto) as Doc;
    expect(strict(child).progress).toBeNull();
  });
});

describe('fuzz (STANDARDS 3)', () => {
  const nasty = fc.oneof(
    fc.constant(null),
    fc.boolean(),
    fc.integer(),
    fc.double({ noNaN: false }),
    fc.constantFrom(1e300, -1e300, 3.7, -0.5, 2 ** 53, Number.MAX_SAFE_INTEGER + 2, -(2 ** 31)),
    fc.string(),
    fc.constantFrom('__proto__', 'constructor', '2026-10-12', '2026-02-30', '1', 'prototype'),
  );
  const jsonish: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
    node: fc.oneof(
      { depthSize: 'small', withCrossShrink: true },
      nasty,
      fc.array(tie('node'), { maxLength: 6 }),
      fc.dictionary(
        fc.oneof(
          fc.string(),
          fc.constantFrom(
            '__proto__',
            'constructor',
            'xp',
            'cards',
            'lessons',
            'settings',
            'today',
            'flags',
            'totals',
            'daysPracticed',
            'schemaVersion',
            'createdDay',
          ),
        ),
        tie('node'),
        { maxKeys: 8 },
      ),
    ),
  })).node;

  /** Takes a valid document and corrupts random leaves. */
  const corrupted = fc
    .tuple(progressArb, fc.array(fc.tuple(fc.nat(), nasty), { minLength: 1, maxLength: 6 }))
    .map(([p, edits]) => {
      const d = JSON.parse(JSON.stringify(p)) as Doc;
      const paths: string[][] = [];
      const walk = (o: unknown, path: string[]): void => {
        if (typeof o === 'object' && o !== null) {
          for (const [k, v] of Object.entries(o)) {
            paths.push([...path, k]);
            walk(v, [...path, k]);
          }
        }
      };
      walk(d, []);
      for (const [i, value] of edits) {
        const path = paths[i % paths.length];
        if (!path) continue;
        let o: Record<string, unknown> = d;
        for (const k of path.slice(0, -1)) {
          const next = o[k];
          if (typeof next !== 'object' || next === null) break;
          o = next as Record<string, unknown>;
        }
        o[path[path.length - 1] ?? ''] = value;
      }
      return d;
    });

  const run = (raw: unknown): void => {
    const s = checkProgress(raw, 'strict');
    if (s.progress !== null) {
      // Strict success must be a genuinely valid document (re-checks clean) and have no issues.
      expect(s.issues).toEqual([]);
      expect(checkProgress(s.progress, 'strict').progress).toEqual(s.progress);
    } else {
      expect(s.issues.length).toBeGreaterThan(0);
    }
    expect(s.issues.length).toBeLessThanOrEqual(20);
    const r = checkProgress(raw, 'repair');
    expect(r.issues.length).toBeLessThanOrEqual(20);
    if (r.progress !== null) {
      // Repair output always passes strict, and repairing twice changes nothing.
      const again = checkProgress(r.progress, 'strict');
      expect(again.issues).toEqual([]);
      expect(again.progress).toEqual(r.progress);
      expect(checkProgress(r.progress, 'repair').progress).toEqual(r.progress);
    }
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  };

  it('arbitrary JSON values never throw and never yield invalid progress', () => {
    fc.assert(fc.property(jsonish, run), { numRuns: 400 });
  });
  it('arbitrary JSON strings parsed as JSON behave the same', () => {
    fc.assert(
      fc.property(fc.json(), (text) => {
        run(JSON.parse(text));
      }),
      { numRuns: 200 },
    );
  });
  it('corrupted valid documents never throw; repair output always passes strict', () => {
    fc.assert(fc.property(corrupted, run), { numRuns: 400 });
  });
  it('documents with weird numbers in every numeric slot', () => {
    const slots: string[][] = [
      ['xp'],
      ['totals', 'lessonsDone'],
      ['totals', 'questionsAnswered'],
      ['today', 'lessonsDone'],
      ['settings', 'dailyGoal'],
      ['lessons', 'u1-l1', 'timesCompleted'],
      ['lessons', 'u1-l1', 'bestAccuracy'],
      ['cards', 'treble-C4', 'box'],
      ['cards', 'treble-C4', 'seen'],
      ['cards', 'treble-C4', 'correct'],
      ['cards', 'treble-C4', 'avgMs'],
    ];
    fc.assert(
      fc.property(
        fc.constantFrom(...slots),
        fc.oneof(fc.double(), fc.integer(), fc.string()),
        (slot, v) => {
          run(withPath(slot, v));
        },
      ),
      { numRuns: 300 },
    );
  });
  it('huge arrays and maps: 10 000 entries', () => {
    const big = Array.from({ length: 10_000 }, (_, i) => i);
    const bigMap = Object.fromEntries(big.map((i) => [`k${String(i)}`, i]));
    run(withPath(['daysPracticed'], big));
    run(withPath(['lessons'], bigMap));
    run(withPath(['cards'], bigMap));
  });
  it('deeply nested junk is never walked', () => {
    let deep: unknown = 1;
    for (let i = 0; i < 20_000; i++) deep = [deep];
    run(withPath(['xp'], deep));
    run(withPath(['extra'], deep));
  });
});
