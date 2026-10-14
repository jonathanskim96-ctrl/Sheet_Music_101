import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  everythingDone,
  finish,
  fixtureProgress,
  playLesson,
  progressAfter,
  readStored,
  seedProgress,
  seedRawJson,
  seedRecord,
  startFresh,
} from './helpers';

// M7 step 5, second pass (Opus review): attacks that e2e/hardening.spec.ts did not cover.
// Everything runs against the local e2e build only.

const NOT_BACKUP = "That file isn't a Sheet Music 101 backup.";
const DAMAGED = "That backup file is damaged and can't be used.";
const TOO_BIG = 'That file is too big to be a backup.';
const NEWER =
  'This backup is from a newer version of the app. Update the app first, then try again.';
const PREVIEW = 'preview';

const MARKUP = '<img src=x onerror="window.__pwned=1">';

/** Nothing from a hostile input became markup, and Object.prototype is untouched. */
async function expectClean(page: Page): Promise<void> {
  const state = await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    const probe = {} as Record<string, unknown>;
    return {
      pwned: w['__pwned'],
      polluted: [probe['polluted'], probe['timesCompleted'], probe['box']],
      injected: document.querySelectorAll('img, iframe, object, embed, body script:not([src])')
        .length,
      markupText: document.body.textContent.includes('onerror'),
    };
  });
  expect(state).toEqual({
    pwned: undefined,
    polluted: [undefined, undefined, undefined],
    injected: 0,
    markupText: false,
  });
}

/** A backup file as text, with the progress document given as raw JSON text. */
const envelope = (progress: string, extra = ''): string =>
  `{"app":"sheet-music-101","kind":"backup","schemaVersion":1,"exportedAt":"2026-10-12T20:15:00.000Z"${extra},"progress":${progress}}`;
const fixtureText = (): string => JSON.stringify(fixtureProgress());
/** The fixture with one top-level field replaced by raw JSON text. */
const withField = (field: string, raw: string): string => {
  const p = fixtureProgress() as unknown as Record<string, unknown>;
  if (!(field in p)) throw new Error(`no ${field} in the fixture`);
  p[field] = '@@RAW@@';
  return envelope(JSON.stringify(p).replace('"@@RAW@@"', raw));
};

const manyEntries = (n: number, key: (i: number) => string, value: string): string =>
  `{${Array.from({ length: n }, (_, i) => `"${key(i)}":${value}`).join(',')}}`;

const LESSON =
  '{"timesCompleted":1,"bestAccuracy":90,"firstCompletedDay":"2026-10-01","lastCompletedDay":"2026-10-01"}';

const BAD_UTF8 = Buffer.from([0xff, 0xfe, 0x80, 0xc0, 0xed, 0xa0, 0x80]);

const CASES: [string, () => string | Buffer, string][] = [
  // Prototype pollution, at every depth.
  [
    '__proto__ inside the lessons map',
    () => withField('lessons', `{"__proto__":${LESSON}}`),
    DAMAGED,
  ],
  [
    'constructor.prototype inside the lessons map',
    () => withField('lessons', '{"constructor":{"prototype":{"polluted":"yes"}}}'),
    DAMAGED,
  ],
  ['__proto__ inside the cards map', () => withField('cards', '{"__proto__":{"box":5}}'), DAMAGED],
  [
    '__proto__ inside one card',
    () =>
      withField(
        'cards',
        '{"treble-C4":{"__proto__":{"polluted":"yes"},"box":2,"lastSeenDay":"2026-10-01","lastPromotedDay":null,"seen":3,"correct":2,"avgMs":1200}}',
      ),
    PREVIEW,
  ],
  [
    '__proto__ in the envelope and in settings',
    () =>
      envelope(
        fixtureText().replace('"settings":{', '"settings":{"__proto__":{"polluted":"yes"},'),
        ',"__proto__":{"polluted":"yes"}',
      ),
    PREVIEW,
  ],
  // Nesting and encodings.
  [
    '10 000 levels deep inside a card',
    () => withField('cards', `{"treble-C4":${'['.repeat(10_000)}${']'.repeat(10_000)}}`),
    DAMAGED,
  ],
  [
    'invalid UTF-8 inside a valid backup (in exportedAt)',
    () => {
      const [a = '', b = ''] = envelope(fixtureText()).split('2026-10-12T20:15:00.000Z');
      return Buffer.concat([Buffer.from(a), BAD_UTF8, Buffer.from(b)]);
    },
    PREVIEW,
  ],
  [
    'invalid UTF-8 as a lesson id',
    () => {
      const [a = '', b = ''] = envelope(fixtureText()).split('"lessons":{');
      return Buffer.concat([
        Buffer.from(`${a}"lessons":{"u2-`),
        BAD_UTF8,
        Buffer.from(`":${LESSON},${b}`),
      ]);
    },
    DAMAGED,
  ],
  ['a UTF-8 BOM before a valid backup', () => `\uFEFF${envelope(fixtureText())}`, PREVIEW],
  [
    'a UTF-16 file with a BOM (decoded by the browser, then strictly checked)',
    () => Buffer.from(`\uFEFF${envelope(fixtureText())}`, 'utf16le'),
    PREVIEW,
  ],
  // Numbers.
  ['xp = -1', () => withField('xp', '-1'), DAMAGED],
  ['xp = -0', () => withField('xp', '-0'), PREVIEW],
  ['xp = 1e9 + 1', () => withField('xp', '1000000001'), DAMAGED],
  ['xp = 1e308', () => withField('xp', '1e308'), DAMAGED],
  ['xp = 2.5', () => withField('xp', '2.5'), DAMAGED],
  ['xp = 1.0 (a whole number written as a float)', () => withField('xp', '1.0'), PREVIEW],
  ['dailyGoal = 4', () => withField('settings', '{"soundOn":true,"dailyGoal":4}'), DAMAGED],
  // Strings.
  [
    'markup in exportedAt',
    () => envelope(fixtureText()).replace('"2026-10-12T20:15:00.000Z"', JSON.stringify(MARKUP)),
    PREVIEW,
  ],
  [
    'control characters and 100 000 characters in exportedAt',
    () =>
      envelope(fixtureText()).replace(
        '"2026-10-12T20:15:00.000Z"',
        JSON.stringify(`\u0000\u001b[31m\u202E${'x'.repeat(100_000)}`),
      ),
    PREVIEW,
  ],
  ['markup as a day', () => withField('createdDay', JSON.stringify(MARKUP)), DAMAGED],
  [
    'a 33-character lesson id',
    () => withField('lessons', `{"${'a'.repeat(33)}":${LESSON}}`),
    DAMAGED,
  ],
  [
    'markup as app name',
    () => envelope(fixtureText()).replace('"sheet-music-101"', JSON.stringify(MARKUP)),
    NOT_BACKUP,
  ],
  // Shapes.
  [
    'duplicate keys (the last one wins, then it is validated)',
    () => withField('xp', '5,"xp":-5'),
    DAMAGED,
  ],
  ['lessons as a list', () => withField('lessons', '[]'), DAMAGED],
  ['cards as a string', () => withField('cards', '"treble-C4"'), DAMAGED],
  ['daysPracticed as a string', () => withField('daysPracticed', '"2026-10-01"'), DAMAGED],
  [
    '3 000 lesson entries',
    () =>
      withField(
        'lessons',
        manyEntries(3000, (i) => `l${String(i)}`, LESSON),
      ),
    DAMAGED,
  ],
  [
    '5 000 made-up card ids',
    () =>
      withField(
        'cards',
        manyEntries(5000, (i) => `treble-Q${String(i)}`, '{}'),
      ),
    DAMAGED,
  ],
  [
    'the envelope schemaVersion is 3',
    () =>
      envelope(fixtureText()).replace(
        '"schemaVersion":1,"exportedAt"',
        '"schemaVersion":3,"exportedAt"',
      ),
    NEWER,
  ],
  ['the progress schemaVersion is 3', () => withField('schemaVersion', '3'), NEWER],
  ['the progress schemaVersion is "1" (text)', () => withField('schemaVersion', '"1"'), DAMAGED],
  [
    'kind is not "backup"',
    () => envelope(fixtureText()).replace('"kind":"backup"', '"kind":"progress"'),
    NOT_BACKUP,
  ],
];

async function importFile(page: Page, content: string | Buffer, name = 'evil.json'): Promise<void> {
  await page.getByTestId('import-input').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: typeof content === 'string' ? Buffer.from(content) : content,
  });
}

for (const [label, content, outcome] of CASES) {
  test(`backup attack, ${label}: ${outcome === PREVIEW ? 'clean preview' : 'refused'}, nothing stored, nothing rendered`, async ({
    page,
  }) => {
    await seedProgress(page, fixtureProgress());
    await page.goto('./#/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    const before = await readStored(page);
    await importFile(page, content());
    if (outcome === PREVIEW) {
      await expect(page.getByTestId('import-preview')).toBeVisible();
      await expectClean(page);
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    } else {
      await expect(page.getByTestId('toast')).toHaveText(outcome);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    expect(await readStored(page)).toEqual(before);
    await expectClean(page);
  });
}

test('backup attack: exactly 1 000 000 bytes is read, 1 000 001 is refused before reading', async ({
  page,
}) => {
  await seedProgress(page, fixtureProgress());
  await page.goto('./#/settings');
  const before = await readStored(page);
  const body = envelope(fixtureText());
  await importFile(page, body + ' '.repeat(1_000_000 - Buffer.byteLength(body)));
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await importFile(page, body + ' '.repeat(1_000_001 - Buffer.byteLength(body)));
  await expect(page.getByTestId('toast')).toHaveText(TOO_BIG);
  expect(await readStored(page)).toEqual(before);
});

test('backup attack: a hostile file name is never shown', async ({ page }) => {
  await seedProgress(page, fixtureProgress());
  await page.goto('./#/settings');
  await importFile(page, 'nope', `${MARKUP}.json`);
  await expect(page.getByTestId('toast')).toHaveText(NOT_BACKUP);
  await expectClean(page);
});

test('backup attack: a valid backup with __proto__ keys restores cleanly and stores no prototype key', async ({
  page,
}) => {
  await seedProgress(page, progressAfter(2));
  await page.goto('./#/settings');
  await importFile(
    page,
    envelope(
      fixtureText().replace(/^\{/, '{"__proto__":{"polluted":"yes"},'),
      ',"__proto__":{"polluted":"yes"}',
    ),
  );
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Replace my progress' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const stored = (await readStored(page)) as { doc: Record<string, unknown> };
  expect(Object.keys(stored.doc).sort()).toEqual(Object.keys(fixtureProgress()).sort());
  expect(stored.doc['xp']).toBe(fixtureProgress().xp);
  await expectClean(page);
});

// ------------------------------------------------------------------ hostile stored data

const record = (doc: string, rev = 9): string =>
  `{"rev":${String(rev)},"savedAt":"2026-10-12T10:00:00.000Z","doc":${doc}}`;

test('stored data with __proto__ keys at every level is repaired without polluting anything, and not rewritten on load', async ({
  page,
}) => {
  const p = progressAfter(2) as unknown as Record<string, unknown>;
  p['cards'] = '@@CARDS@@';
  const doc = JSON.stringify(p)
    .replace(/^\{/, '{"__proto__":{"polluted":"yes"},')
    .replace('"lessons":{', '"lessons":{"__proto__":{"timesCompleted":9},')
    .replace('"@@CARDS@@"', '{"__proto__":{"box":5}}');
  await seedRawJson(page, record(doc));
  const stored = await readStored(page);
  await expect(page.getByTestId('toast')).toHaveText(
    'Some saved data was damaged and has been repaired.',
  );
  await expect(page.getByTestId('bubble-u1-l3')).toHaveAttribute('data-state', 'current');
  await expectClean(page);
  // Repair happens in memory; the stored record changes only with the learner's next save.
  expect(await readStored(page)).toEqual(stored);
});

test('stored data with huge arrays and wrong types is repaired and the app stays usable', async ({
  page,
}) => {
  const p = progressAfter(2) as unknown as Record<string, unknown>;
  p['daysPracticed'] = Array.from({ length: 60_000 }, () => '2026-10-01');
  p['xp'] = -5;
  p['settings'] = 'loud';
  p['cards'] = [];
  await seedRecord(page, { rev: 9, savedAt: 'x', doc: p });
  await expect(page.getByTestId('bubble-u1-l3')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('xp-value')).toHaveText('0');
});

for (const [label, doc, reason] of [
  ['a bare string', '"hello"', "can't be read"],
  ['a list', '[1,2,3]', "can't be read"],
] as const) {
  test(`stored data ${label}: broken screen, never overwritten, Start fresh needs both sheets`, async ({
    page,
  }) => {
    await seedRawJson(page, record(doc, 3));
    await expect(
      page.getByRole('heading', { name: "We couldn't read your saved progress." }),
    ).toBeVisible();
    await expect(page.getByTestId('broken-screen')).toContainText(reason);
    const stored = await readStored(page);
    await page.getByRole('button', { name: 'Start fresh' }).click();
    await page.getByRole('button', { name: 'Continue without backup' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.reload();
    await expect(page.getByTestId('broken-screen')).toBeVisible();
    expect(await readStored(page)).toEqual(stored);
  });
}

test('stored data from a newer schema (a downgrade): broken screen offers Reload the app, no Start fresh, nothing overwritten', async ({
  page,
}) => {
  await seedRawJson(page, record('{"schemaVersion":3,"xp":5}', 3));
  await expect(
    page.getByRole('heading', { name: "We couldn't read your saved progress." }),
  ).toBeVisible();
  await expect(page.getByTestId('broken-screen')).toContainText('newer version');
  await expect(page.getByRole('button', { name: 'Start fresh' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  const stored = await readStored(page);
  await page.getByRole('button', { name: 'Reload the app' }).click();
  await expect(page.getByTestId('broken-screen')).toBeVisible();
  expect(await readStored(page)).toEqual(stored);
});

test('a stored rev that goes backwards (another tab or an old copy) is built on, not overwritten', async ({
  page,
}) => {
  await seedProgress(page, progressAfter(2)); // rev 50
  await expect(page.getByTestId('bubble-u1-l3')).toBeVisible();
  // Something else writes rev 3 with different progress while this tab is open.
  const theirs = progressAfter(3, (p) => {
    p.xp = 777;
  });
  await page.evaluate(async (doc) => {
    await new Promise<void>((resolve) => {
      const open = indexedDB.open('sheet-music-101', 1);
      open.onsuccess = () => {
        const tx = open.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put({ rev: 3, savedAt: 'x', doc }, 'progress');
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
      };
    });
  }, theirs);
  await page.goto('./#/settings');
  await page.getByTestId('sound-switch').click();
  await expect(page.getByTestId('sound-switch')).toHaveAttribute('aria-checked', 'false');
  const stored = (await readStored(page)) as { rev: number; doc: { xp: number; lessons: object } };
  expect(stored.rev).toBe(4);
  expect(stored.doc.xp).toBe(777);
  expect(Object.keys(stored.doc.lessons)).toHaveLength(3);
});

// ------------------------------------------------------------------ hostile routes, round two

const ROUTES = [
  '#/lesson/%253Cscript%253E',
  '#/lesson/%2e%2e%2f%2e%2e%2f',
  '#/lesson/%252e%252e%252f',
  '#/lesson/u2-l1%00',
  '#/lesson/u2-l1%0d%0aSet-Cookie:x',
  '#/lesson/u\uFF12-l1',
  '#/lesson/u2-l1\u202E',
  '#/lesson/javascript:alert(1)',
  '#/lesson/data:text/html,<script>1</script>',
  '#/lesson/cp-a',
  '#/checkpoint/u2-l1',
  '#/checkpoint/constructor',
  '#/checkpoint/__proto__',
  '#/review/../settings',
  '#/progress/../../',
  '#javascript:alert(1)',
  `#/lesson/${'u2-l1/'.repeat(20_000)}`,
  `#/${'%'.repeat(10_000)}`,
];

for (const hash of ROUTES) {
  test(`route ${JSON.stringify(hash.slice(0, 40))} settles on #/ with the Path`, async ({
    page,
  }) => {
    await seedProgress(page, progressAfter(2));
    await expect(page.getByTestId('bubble-u1-l3')).toBeVisible();
    await page.goto(`./${hash}`);
    // Wait for the app to handle the new hash (goto returns before hashchange is processed).
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/');
    await expect(page.getByTestId('bubble-u1-l3')).toBeVisible();
    await expect(page.getByTestId('lesson-complete').or(page.getByTestId('question'))).toHaveCount(
      0,
    );
    await expectClean(page);
  });
}

// ------------------------------------------------------------------ CSP, every directive

const EXPECTED_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
];

test('the CSP is exactly the SPEC 7.9 policy and refuses every kind of outside or dynamic code', async ({
  page,
  consoleErrors,
}) => {
  await page.goto('./');
  const meta = page.locator('meta[http-equiv="Content-Security-Policy"]');
  const policy = (await meta.getAttribute('content')) ?? '';
  expect(policy.split(';').map((d) => d.trim())).toEqual(EXPECTED_CSP);
  // It must be the first thing in <head>, before any script.
  expect(
    await page.evaluate(() => document.head.firstElementChild?.getAttribute('http-equiv')),
  ).toBe('Content-Security-Policy');

  const result = await page.evaluate(async () => {
    const seen: string[] = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      seen.push(e.effectiveDirective);
    });
    const ran: Record<string, unknown> = {};
    const attempt = async (name: string, fn: () => unknown) => {
      try {
        ran[name] = await fn();
      } catch {
        ran[name] = 'refused';
      }
    };
    // eval and new Function are not tried here: code that Playwright evaluates is exempt from
    // the page's CSP, like the DevTools console. hardening.spec.ts proves the policy refuses
    // string-to-code from the page itself (a string handed to setTimeout).
    await attempt('fetch', () => fetch('https://example.invalid/x').then(() => 'loaded'));
    await attempt(
      'xhr',
      () =>
        new Promise((resolve, reject) => {
          const x = new XMLHttpRequest();
          x.open('GET', 'https://example.invalid/y');
          x.onload = () => {
            resolve('loaded');
          };
          x.onerror = () => {
            reject(new Error('blocked'));
          };
          x.send();
        }),
    );
    await attempt(
      'remote script',
      () =>
        new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://example.invalid/z.js';
          s.onload = () => {
            resolve('loaded');
          };
          s.onerror = () => {
            reject(new Error('blocked'));
          };
          document.head.append(s);
        }),
    );
    await attempt(
      'remote image',
      () =>
        new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => {
            resolve('loaded');
          };
          i.onerror = () => {
            reject(new Error('blocked'));
          };
          i.src = 'https://example.invalid/i.png';
        }),
    );
    await attempt('inline style', async () => {
      const st = document.createElement('style');
      st.textContent = 'body { --pwned: 1 }';
      document.head.append(st);
      await new Promise((r) => setTimeout(r, 50));
      const v = getComputedStyle(document.body).getPropertyValue('--pwned');
      st.remove();
      return v === '' ? 'refused' : 'applied';
    });
    await attempt('base tag', () => {
      const b = document.createElement('base');
      b.href = 'https://example.invalid/';
      document.head.append(b);
      const href = document.baseURI;
      b.remove();
      return href.startsWith('https://example.invalid') ? 'applied' : 'refused';
    });
    await new Promise((r) => setTimeout(r, 300));
    return { ran, seen: [...new Set(seen)].sort() };
  });
  for (const value of Object.values(result.ran)) expect(value).toBe('refused');
  expect(result.seen).toEqual([
    'base-uri',
    'connect-src',
    'img-src',
    'script-src-elem',
    'style-src-elem',
  ]);
  // Only the refusals themselves may have been logged.
  const others = consoleErrors.filter(
    (e) => !/Content Security Policy|Failed to load resource|example\.invalid/.test(e),
  );
  expect(others).toEqual([]);
  consoleErrors.length = 0;
});

// ------------------------------------------------------------------ network, a full session

function watchOutside(context: BrowserContext, origin: string): string[] {
  const outside: string[] = [];
  context.on('request', (req) => {
    const url = req.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });
  return outside;
}

test('a full session never contacts anything outside the app’s own origin', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const outside = watchOutside(context, new URL(baseURL ?? '').origin);
  // Welcome and a first lesson.
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await finish(page);
  // Review, a checkpoint, Progress and Settings with every outward-looking action.
  await seedProgress(page, Object.assign(everythingDone(), { cards: fixtureProgress().cards }));
  await page.goto('./#/review');
  await playLesson(page);
  await finish(page);
  await page.goto('./#/checkpoint/cp-a');
  await playLesson(page);
  await finish(page);
  await page.goto('./#/progress');
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await page.goto('./#/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save a backup' }).click();
  const file = await (await download).path();
  await page.getByTestId('import-input').setInputFiles(file);
  await page.getByRole('button', { name: 'Replace my progress' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'Continue without backup' }).click();
  await page.getByRole('button', { name: 'Erase everything' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('./');
  await expect(page.getByRole('button', { name: "Let's start" })).toBeVisible();
  expect(outside).toEqual([]);
});

// ------------------------------------------------------------------ service worker

test('offline: once installed, the app starts from the service worker with no network at all', async ({
  page,
  context,
}) => {
  await seedProgress(page, progressAfter(2));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('bubble-u1-l3')).toBeVisible();
  await page.goto('./#/progress');
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await context.setOffline(false);
});

test('the service worker precaches only the app’s own files', async ({ page, baseURL }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const urls = await page.evaluate(async () => {
    const out: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) out.push(req.url);
    }
    return out;
  });
  expect(urls.length).toBeGreaterThan(5);
  for (const url of urls) expect(new URL(url).origin).toBe(new URL(baseURL ?? '').origin);
  expect(urls.some((u) => u.endsWith('.map'))).toBe(false);
});

// ------------------------------------------------------------------ races and abuse

test('two tabs finishing lessons at the same time both keep their result', async ({
  page,
  context,
}) => {
  await seedProgress(
    page,
    progressAfter(4, (p) => {
      p.flags.keyboardUnlockSeen = true;
    }),
  );
  const other = await context.newPage();
  await other.goto('./');
  await expect(other.getByTestId('bubble-u2-l1')).toBeVisible();
  // Both tabs play a lesson; each was loaded before the other saved.
  await page.goto('./#/lesson/u1-l1');
  await other.goto('./#/lesson/u2-l1');
  await playLesson(page);
  await playLesson(other);
  await finish(page);
  await finish(other);
  const stored = (await readStored(page)) as {
    doc: { lessons: Record<string, { timesCompleted: number }>; totals: { lessonsDone: number } };
  };
  expect(stored.doc.lessons['u1-l1'].timesCompleted).toBe(2);
  expect(stored.doc.lessons['u2-l1'].timesCompleted).toBe(1);
  await other.close();
});

test('a restore in one tab while a lesson is open in another: the lesson is added on top of the restored progress', async ({
  page,
  context,
}) => {
  await seedProgress(page, progressAfter(2));
  const other = await context.newPage();
  await other.goto('./#/lesson/u1-l1');
  await expect(other.getByTestId('concept-card')).toBeVisible();
  await page.goto('./#/settings');
  await page.getByTestId('import-input').setInputFiles({
    name: 'b.json',
    mimeType: 'application/json',
    buffer: Buffer.from(envelope(fixtureText())),
  });
  await page.getByRole('button', { name: 'Replace my progress' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await playLesson(other);
  await finish(other);
  const stored = (await readStored(page)) as { doc: { xp: number } };
  // The restored xp plus at least the +10 of the finished lesson.
  expect(stored.doc.xp).toBeGreaterThanOrEqual(fixtureProgress().xp + 10);
  await other.close();
});

test('when the disk refuses a write (quota), the lesson stays in memory, the error shows, and Try again saves it', async ({
  page,
}) => {
  await seedProgress(page, progressAfter(2));
  await expect(page.getByTestId('bubble-u1-l3')).toBeVisible();
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    w['__realPut'] = Reflect.get(IDBObjectStore.prototype, 'put');
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
  });
  await page.getByTestId('bubble-u1-l3').click();
  await playLesson(page);
  await expect(page.getByRole('alert').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('save-error')).toContainText('quota');
  expect(((await readStored(page)) as { rev: number }).rev).toBe(50);
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    IDBObjectStore.prototype.put = w['__realPut'] as typeof IDBObjectStore.prototype.put;
  });
  await page.getByTestId('save-error').getByRole('button').click();
  await expect(page.getByTestId('save-error')).toHaveCount(0);
  const stored = (await readStored(page)) as { rev: number; doc: { lessons: object } };
  expect(stored.rev).toBe(51);
  expect(Object.keys(stored.doc.lessons)).toContain('u1-l3');
});

test('rapid repeated answers and double taps on Continue never skip a question', async ({
  page,
}) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await page.getByRole('button', { name: 'Got it' }).click();
  for (let i = 0; i < 3; i++) {
    const q = page.getByTestId('question');
    const right = JSON.parse((await q.getAttribute('data-answer')) ?? '{}') as { letter: string };
    // Five taps in one go: only the first may count.
    await q.getByRole('button', { name: right.letter, exact: true }).evaluate((b: HTMLElement) => {
      for (let n = 0; n < 5; n++) b.click();
    });
    await page.getByRole('button', { name: 'Continue' }).evaluate((b: HTMLElement) => {
      b.click();
      b.click();
    });
    await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute(
      'aria-valuenow',
      String(i + 1),
    );
  }
});

test('the clock: a lesson at 23:59 on 31 December counts for that year, the next one for the new year, and a clock set back is harmless', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-12-31T23:58:30') });
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await finish(page);
  await page.clock.setSystemTime(new Date('2027-01-01T00:01:00'));
  await page.getByTestId('bubble-u1-l2').click();
  await playLesson(page);
  await finish(page);
  await page.clock.setSystemTime(new Date('2026-06-01T12:00:00'));
  await page.getByTestId('bubble-u1-l3').click();
  await playLesson(page);
  await finish(page);
  const stored = (await readStored(page)) as {
    doc: { daysPracticed: string[]; xp: number };
  };
  expect(stored.doc.daysPracticed).toEqual(['2026-06-01', '2026-12-31', '2027-01-01']);
  await expect(page.getByTestId('xp-value')).toHaveText(String(stored.doc.xp));
});
