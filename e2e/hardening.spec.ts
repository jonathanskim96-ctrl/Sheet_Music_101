import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  answerQuestion,
  fixtureProgress,
  playLesson,
  progressAfter,
  readStored,
  seedProgress,
  startFresh,
} from './helpers';

// M7: black-box attack checks (step 5), accessibility (step 3) and speed (step 4), run against
// the production-like e2e build.

const NOT_BACKUP = "That file isn't a Sheet Music 101 backup.";
const DAMAGED = "That backup file is damaged and can't be used.";
const TOO_BIG = 'That file is too big to be a backup.';

// ------------------------------------------------------------------ CSP and framing

test('the page carries a strict CSP, and the browser blocks eval and injected inline script', async ({
  page,
  consoleErrors,
}) => {
  await page.goto('./');
  const csp = await page.evaluate(
    () =>
      document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute('content') ?? '',
  );
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("connect-src 'self'");

  // Code that runs from the page itself (not the developer console, which browsers exempt from the
  // CSP): a string handed to setTimeout (eval), an inline event handler and an injected inline
  // script. All three must be refused.
  const result = await page.evaluate(async () => {
    const seen: string[] = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      seen.push(e.violatedDirective);
    });
    // Called through a loosely typed alias on purpose: this is the attack, not code to copy.
    const timer = setTimeout as unknown as (code: string, ms: number) => void;
    timer('window.__pwned1 = 1', 0);
    const button = document.createElement('button');
    button.setAttribute('onclick', 'window.__pwned2 = 1');
    document.body.append(button);
    button.click();
    const script = document.createElement('script');
    script.textContent = 'window.__pwned3 = 1';
    document.head.append(script);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const w = window as unknown as Record<string, unknown>;
    return { seen, ran: [w['__pwned1'], w['__pwned2'], w['__pwned3']] };
  });
  expect(result.ran).toEqual([undefined, undefined, undefined]);
  expect(result.seen.length).toBe(3);

  // The browser logs each refusal as a console error; those three are the point of this test.
  expect(consoleErrors.filter((e) => e.includes('Content Security Policy'))).toHaveLength(3);
  consoleErrors.length = 0;
});

test('the manifest and head tags match SPEC 7.8 and 7.9', async ({
  page,
  request,
}) => {
  await page.goto('./');
  expect(await page.locator('meta[name="referrer"]').getAttribute('content')).toBe('no-referrer');
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain(
    'viewport-fit=cover',
  );
  expect(await page.locator('link[rel="apple-touch-icon"]').count()).toBe(1);
  const href = (await page.locator('link[rel="manifest"]').getAttribute('href')) ?? '';
  const manifest = (await (await request.get(new URL(href, page.url()).href)).json()) as Record<
    string,
    unknown
  > & { icons: { sizes: string; purpose?: string }[]; shortcuts: { name: string; url: string }[] };
  expect(manifest).toMatchObject({
    name: 'Sheet Music 101',
    short_name: 'Music 101',
    description: 'Learn to read piano music, a few minutes a day.',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#15803D',
    background_color: '#FFFFFF',
  });
  expect(manifest.icons.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512', '512x512']);
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  expect(manifest.shortcuts).toEqual([
    expect.objectContaining({ name: 'Practise', url: './#/review' }),
    expect.objectContaining({ name: 'Progress', url: './#/progress' }),
  ]);
});

test('loaded inside a page of the same site, the app takes over the whole window (frame-busting)', async ({
  page,
}) => {
  await page.route('**/framer.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>framer</title><iframe src="./" width="400" height="600"></iframe>',
    }),
  );
  await page.goto('./framer.html');
  await expect(page.getByRole('button', { name: "Let's start" })).toBeVisible();
  expect(page.url()).not.toContain('framer.html');
  expect(page.frames().length).toBe(1);
});

test('the service worker is scoped to the app folder only', async ({ page }) => {
  await page.goto('./');
  const scope = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { scope: reg.scope, base: new URL('./', location.href).href };
  });
  expect(scope.scope).toBe(scope.base);
  expect(new URL(scope.scope).pathname).toBe('/Sheet_Music_101/');
});

test('a full lesson, Progress and Settings make no request outside the app’s own origin', async ({
  page,
}) => {
  const origin = new URL(page.url() === 'about:blank' ? 'http://localhost:4173' : page.url())
    .origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith(origin)) {
      outside.push(url);
    }
  });
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.goto('./#/progress');
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  expect(outside).toEqual([]);
});

// ------------------------------------------------------------------ hostile routes

const HOSTILE_HASHES = [
  '#/lesson/<script>window.__pwned=1</script>',
  '#/lesson/%3Cscript%3Ealert(1)%3C%2Fscript%3E',
  '#/lesson/../../',
  '#/lesson/..%2F..%2Fetc%2Fpasswd',
  '#/lesson/constructor',
  '#/lesson/__proto__',
  '#/checkpoint/%00',
  '#/checkpoint/cp-z',
  '#/lesson/u2-l1/extra',
  '#//////',
  `#/lesson/${'a'.repeat(5000)}`,
  `#/${'x/'.repeat(3000)}`,
  '#/javascript:alert(1)',
];

for (const hash of HOSTILE_HASHES) {
  test(`hostile route ${hash.slice(0, 40)}… ends on the Path without a script, dialog or error`, async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await seedProgress(page, progressAfter(2));
    await page.goto(`./${hash}`);
    await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as Record<string, unknown>)['__pwned']),
    ).toBeUndefined();
    expect(await page.locator('main script, body script:not([src])').count()).toBe(0);
    expect(dialogs).toEqual([]);
  });
}

// ------------------------------------------------------------------ hostile backups

const wrap = (progress: string): string =>
  `{"app":"sheet-music-101","kind":"backup","schemaVersion":1,"exportedAt":"2026-10-12T20:15:00.000Z","progress":${progress}}`;
const valid = (): string => JSON.stringify(fixtureProgress());
const withXp = (xp: string): string => wrap(valid().replace(/"xp":\d+/, `"xp":${xp}`));

const hostile: [string, () => string | Buffer, string][] = [
  ['nested 10 000 levels deep', () => '['.repeat(10_000) + ']'.repeat(10_000), NOT_BACKUP],
  [
    'nested 10 000 levels deep inside the progress',
    () => wrap('{"xp":' + '['.repeat(10_000) + ']'.repeat(10_000) + '}'),
    DAMAGED,
  ],
  [
    'invalid UTF-8',
    () => Buffer.from([0x7b, 0x22, 0xff, 0xfe, 0x80, 0xc0, 0x22, 0x7d]),
    NOT_BACKUP,
  ],
  ['an enormous number (1e999)', () => withXp('1e999'), DAMAGED],
  ['a huge integer', () => withXp('99999999999999999999999'), DAMAGED],
  ['xp as text', () => withXp('"5"'), DAMAGED],
  ['xp as a fraction', () => withXp('3.7'), DAMAGED],
  ['xp as null', () => withXp('null'), DAMAGED],
  ['progress as a list', () => wrap('[]'), DAMAGED],
  ['progress as a string', () => wrap('"hello"'), DAMAGED],
  ['progress as null', () => wrap('null'), DAMAGED],
  ['a bare number', () => '42', NOT_BACKUP],
  ['an empty file', () => '', NOT_BACKUP],
  ['a file just over 1 MB', () => ' '.repeat(1_000_001), TOO_BIG],
  [
    '1 500 lesson entries',
    () => {
      const p = JSON.parse(valid()) as Record<string, unknown>;
      p['lessons'] = Object.fromEntries(
        Array.from({ length: 1500 }, (_, i) => [
          `l-${String(i)}`,
          {
            timesCompleted: 1,
            bestAccuracy: 1,
            firstCompletedDay: '2026-10-01',
            lastCompletedDay: '2026-10-01',
          },
        ]),
      );
      return wrap(JSON.stringify(p));
    },
    DAMAGED,
  ],
  [
    'cards under made-up note names',
    () => {
      const p = JSON.parse(valid()) as { cards: Record<string, unknown> };
      p.cards['treble-Z9'] = p.cards['treble-C4'] ?? {};
      return wrap(JSON.stringify(p));
    },
    DAMAGED,
  ],
];

async function importHostile(page: Page, content: string | Buffer): Promise<void> {
  await page.getByTestId('import-input').setInputFiles({
    name: 'evil.json',
    mimeType: 'application/json',
    buffer: typeof content === 'string' ? Buffer.from(content) : content,
  });
}

for (const [label, content, message] of hostile) {
  test(`hostile backup, ${label}: refused with a fixed message, nothing changes`, async ({
    page,
  }) => {
    await seedProgress(page, fixtureProgress());
    await page.goto('./#/settings');
    const before = await readStored(page);
    await importHostile(page, content());
    await expect(page.getByTestId('toast')).toHaveText(message);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await readStored(page)).toEqual(before);
    // The app still works afterwards.
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
}

test('hostile backup carrying __proto__ keys: Object.prototype stays clean, also after restoring', async ({
  page,
}) => {
  const poisoned = wrap(
    valid()
      .replace(
        /^\{/,
        '{"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted":"yes"}},',
      )
      .replace(/"lessons":\{/, '"lessons":{"__proto__":{"timesCompleted":9},'),
  );
  await seedProgress(page, fixtureProgress());
  await page.goto('./#/settings');
  const before = await readStored(page);
  await importHostile(page, poisoned);
  // Either outcome is acceptable (refused, or a clean preview), but the app must never be polluted.
  await expect(page.getByTestId('toast').or(page.getByRole('dialog'))).toBeVisible();
  const polluted = () =>
    page.evaluate(() => ({
      empty: ({} as Record<string, unknown>)['polluted'],
      lesson: ({} as Record<string, unknown>)['timesCompleted'],
    }));
  expect(await polluted()).toEqual({ empty: undefined, lesson: undefined });
  if (await page.getByRole('dialog').isVisible()) {
    await page.getByRole('button', { name: 'Replace my progress' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const stored = (await readStored(page)) as { doc: Record<string, unknown> };
    expect(Object.keys(stored.doc)).not.toContain('__proto__');
    expect(Object.keys(stored.doc)).not.toContain('constructor');
  } else {
    expect(await readStored(page)).toEqual(before);
  }
  expect(await polluted()).toEqual({ empty: undefined, lesson: undefined });
});

test('hostile saved data (not a backup): prototype keys and wrong types are repaired or refused, never trusted', async ({
  page,
}) => {
  const raw = valid().replace(/^\{/, '{"__proto__":{"polluted":"yes"},');
  await seedProgress(page, JSON.parse(raw) as never);
  await expect(
    page.getByTestId('bubble-u1-l1').or(page.getByRole('heading', { name: /couldn't read/ })),
  ).toBeVisible();
  expect(await page.evaluate(() => (({}) as Record<string, unknown>)['polluted'])).toBeUndefined();
});

// ------------------------------------------------------------------ accessibility

test.describe('keyboard only', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard run is a desktop check');

  const focusedName = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return '';
      return (el.getAttribute('aria-label') ?? el.textContent).trim();
    });

  /** Presses Tab until the element with this name has focus (at most 40 presses). */
  async function tabTo(page: Page, name: string | RegExp): Promise<void> {
    for (let i = 0; i < 40; i++) {
      const now = await focusedName(page);
      if (typeof name === 'string' ? now === name : name.test(now)) return;
      await page.keyboard.press('Tab');
    }
    throw new Error(`Tab never reached "${String(name)}"`);
  }

  const hasVisibleFocus = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !el.matches(':focus-visible')) return false;
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
    });

  test('a whole lesson can be played with Tab, Enter and Space, focus is visible, and the Leave sheet traps and returns focus', async ({
    page,
  }) => {
    await startFresh(page);
    await page.getByTestId('bubble-u1-l1').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Close lesson' })).toBeVisible();

    // The Leave sheet: opens from the X, traps Tab, closes with Escape, and focus returns to the X.
    await tabTo(page, 'Close lesson');
    expect(await hasVisibleFocus(page)).toBe(true);
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', { name: 'Leave this lesson?' });
    await expect(sheet).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    expect(await focusedName(page)).toBe('Close lesson');

    // Play on with the keyboard only.
    for (let guard = 0; guard < 120; guard++) {
      if (await page.getByTestId('lesson-complete').isVisible()) break;
      if (await page.getByTestId('feedback').isVisible()) {
        await tabTo(page, 'Continue');
        expect(await hasVisibleFocus(page)).toBe(true);
        await page.keyboard.press('Space');
      } else if (
        (await page.getByTestId('concept-card').isVisible()) ||
        (await page.getByTestId('meet-card').isVisible())
      ) {
        await tabTo(page, 'Got it');
        await page.keyboard.press('Enter');
      } else {
        const answer = JSON.parse(
          (await page.getByTestId('question').getAttribute('data-answer')) ?? 'null',
        ) as { kind: string; letter?: string; value?: string; note?: string };
        const label =
          answer.kind === 'letter'
            ? (answer.letter ?? '')
            : answer.value === 'line'
              ? 'Line'
              : answer.value === 'space'
                ? 'Space'
                : answer.value === 'first'
                  ? 'First note'
                  : answer.value === 'second'
                    ? 'Second note'
                    : answer.value === 'treble'
                      ? 'Treble clef'
                      : answer.value === 'bass'
                        ? 'Bass clef'
                        : '';
        if (label === '') {
          // Keyboard questions are answered with the keys' own buttons (tested in e2e/lesson).
          await answerQuestion(page, true);
        } else {
          await tabTo(page, label);
          expect(await hasVisibleFocus(page)).toBe(true);
          await page.keyboard.press('Enter');
        }
        await expect(page.getByTestId('feedback')).toBeVisible();
      }
    }
    await expect(page.getByTestId('lesson-complete')).toBeVisible();
  });
});

test('feedback is announced politely, and every button on every screen has a name', async ({
  page,
}) => {
  await seedProgress(page, progressAfter(4));
  const named = async (where: string) => {
    for (const b of await page.getByRole('button').all()) {
      await expect(b, where).toHaveAccessibleName(/\S/);
    }
  };
  await named('path');
  await page.goto('./#/progress');
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await named('progress');
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await named('settings');
  await page.goto('./#/lesson/u2-l1');
  for (let i = 0; i < 3; i++) {
    await named('card');
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  await named('question');
  await answerQuestion(page, false);
  const feedback = page.getByTestId('feedback');
  await expect(feedback).toHaveAttribute('aria-live', 'polite');
  await expect(feedback).toContainText(/\S/);
  await named('feedback');
});

test('with reduced motion there is no confetti and nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await expect(page.getByTestId('lesson-complete')).toBeVisible();
  expect(await page.locator('[data-testid=confetti]').count()).toBe(0);
  const animated = await page.evaluate(
    () => document.getAnimations().filter((a) => a.playState === 'running').length,
  );
  expect(animated).toBe(0);
});

for (const size of [
  { width: 640, height: 400 }, // 200% zoom of a 1280 × 800 window
  { width: 320, height: 568 }, // the narrowest phone
]) {
  test(`at ${String(size.width)} px wide (200% zoom) no text is clipped or pushed off the side`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await seedProgress(page, progressAfter(4));
    const check = async (where: string) => {
      const bad = await page.evaluate(() => {
        const out: string[] = [];
        if (document.documentElement.scrollWidth > window.innerWidth)
          out.push('page scrolls sideways');
        for (const el of document.querySelectorAll<HTMLElement>('body *')) {
          if (!el.textContent.trim() || el.closest('svg')) continue;
          if (el.getBoundingClientRect().width <= 1) continue; // visually hidden on purpose
          const s = getComputedStyle(el);
          const clips = s.overflowX !== 'visible' || s.overflowY !== 'visible';
          if (clips && s.overflowY !== 'auto' && s.overflowY !== 'scroll') {
            if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
              out.push(`${el.tagName}.${el.className} text is cut off`);
            }
          }
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.right > window.innerWidth + 1 && el.children.length === 0) {
            out.push(`${el.tagName}.${el.className} runs off the right edge`);
          }
        }
        return out;
      });
      expect(bad, where).toEqual([]);
    };
    await check('path');
    await page.goto('./#/progress');
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await check('progress');
    await page.goto('./#/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await check('settings');
    await page.goto('./#/lesson/u2-l1');
    await check('concept card');
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Got it' }).click();
    await check('question');
    await answerQuestion(page, false);
    await expect(page.getByTestId('feedback')).toBeVisible();
    await check('feedback');
  });
}

// ------------------------------------------------------------------ speed

test('on a 4× slower processor the Path shows within 2 seconds of opening the app', async ({
  page,
  context,
}) => {
  await seedProgress(page, progressAfter(6));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const started = Date.now();
  await page.goto('./');
  await expect(page.getByTestId('bubble-u2-l1')).toBeVisible();
  const elapsed = Date.now() - started;
  expect(elapsed, `Path took ${String(elapsed)} ms`).toBeLessThan(2000);
});
