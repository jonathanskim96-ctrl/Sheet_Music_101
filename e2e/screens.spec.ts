import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import {
  answerQuestion,
  fixtureProgress,
  playLesson,
  progressAfter,
  seedProgress,
  seedRecord,
} from './helpers';

const SECTIONS = [
  'treble-cards',
  'bass-cards',
  'grand-staff',
  'ledger-lines',
  'note-states',
  'keyboard',
  'mascot',
  'buttons',
  'feedback-bars',
  'sound',
  'confetti',
];

// Screenshots for visual QA (STANDARDS §5/§7). Phone project only.
test.skip(({ isMobile }) => !isMobile, 'screenshots are taken on the phone project only');

for (const scheme of ['light', 'dark'] as const) {
  test(`gallery sections, ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('./#/gallery');
    await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible();
    for (const name of SECTIONS) {
      const section = page.locator(`[data-section="${name}"]`);
      await section.scrollIntoViewIfNeeded();
      await section.screenshot({ path: `test-results/screens/gallery-${name}-${scheme}.png` });
    }
  });

  for (const width of [390, 320]) {
    test(`no horizontal overflow at ${String(width)}px, ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 800 });
      await page.goto('./#/gallery');
      await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

// Real screens (M4): welcome, path, cards, questions, feedback, completion.
for (const scheme of ['light', 'dark'] as const) {
  test(`app screens, ${scheme} mode`, async ({ page }) => {
    test.slow();
    const shot = (name: string) =>
      page.screenshot({ path: `test-results/screens/app-${name}-${scheme}.png` });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });

    await page.goto('./');
    await expect(page.getByRole('button', { name: "Let's start" })).toBeVisible();
    await shot('welcome');
    await page.getByRole('button', { name: "Let's start" }).click();
    await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
    await shot('path-fresh');

    // unit 1: concept card, each kind of question, feedback, completion
    await page.getByTestId('bubble-u1-l1').click();
    await shot('concept-card');
    await page.getByRole('button', { name: 'Got it' }).click();
    await shot('question-alphabet');
    await answerQuestion(page, true);
    await shot('feedback-correct');
    await page.getByRole('button', { name: 'Continue' }).click();
    await answerQuestion(page, false);
    await shot('feedback-wrong');
    await page.getByRole('button', { name: 'Close lesson' }).click();
    await shot('leave-sheet');
    await page.getByRole('button', { name: 'Leave' }).click();

    // later unit 1 lessons: the other question kinds
    await seedProgress(page, progressAfter(1));
    await page.getByTestId('bubble-u1-l2').click();
    for (let i = 0; i < 3; i++) {
      await shot(
        `concept-${(await page.getByTestId('concept-card').getAttribute('data-card')) ?? 'x'}`,
      );
      await page.getByRole('button', { name: 'Got it' }).click();
    }
    await shot('question-keyboard-letter');
    await page.getByRole('button', { name: 'Close lesson' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();
    await seedProgress(page, progressAfter(2));
    await page.getByTestId('bubble-u1-l3').click();
    for (let i = 0; i < 3; i++) {
      await shot(
        `concept-${(await page.getByTestId('concept-card').getAttribute('data-card')) ?? 'x'}`,
      );
      await page.getByRole('button', { name: 'Got it' }).click();
    }
    for (let i = 0; i < 4; i++) {
      const kind = await page.getByTestId('question').getAttribute('data-kind');
      await shot(`question-${kind ?? 'unknown'}-${String(i)}`);
      await answerQuestion(page, true);
      await page.getByRole('button', { name: 'Continue' }).click();
    }
    await page.getByRole('button', { name: 'Close lesson' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();
    await seedProgress(page, progressAfter(3));
    await page.getByTestId('bubble-u1-l4').click();
    await shot('concept-card-grand');
    await page.getByRole('button', { name: 'Got it' }).click();
    await shot('concept-card-bass');
    await page.getByRole('button', { name: 'Got it' }).click();
    await page.getByRole('button', { name: 'Got it' }).click();
    await shot('question-clef');
    await page.getByRole('button', { name: 'Close lesson' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();

    // unit 2: concept card, Meet card, a note question
    await seedProgress(page, progressAfter(4));
    await page.getByTestId('bubble-u2-l1').click();
    await shot('concept-card-landmarks');
    await page.getByRole('button', { name: 'Got it' }).click();
    await shot('meet-card');
    await page.getByRole('button', { name: 'Got it' }).click();
    await shot('meet-card-2');
    await page.getByRole('button', { name: 'Got it' }).click();
    await shot('question-name-note');
    await answerQuestion(page, false);
    await shot('feedback-wrong-note');
    await page.getByRole('button', { name: 'Continue' }).click();
    await playLesson(page);
    await shot('lesson-complete');
    await page.getByRole('button', { name: 'Continue' }).click();

    await seedProgress(page, fixtureProgress());
    await expect(page.getByTestId('bubble-u4-l3')).toBeVisible();
    await shot('path-mid-course');
    await page.setViewportSize({ width: 320, height: 640 });
    await shot('path-mid-course-320');
  });
}

// The iPhone Silent-mode hint under the lesson header (SPEC 7.7).
test.describe('on an iPhone', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  for (const scheme of ['light', 'dark'] as const) {
    test(`lesson with the Silent-mode hint, ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto('./');
      await page.getByRole('button', { name: "Let's start" }).click();
      await page.getByTestId('bubble-u1-l1').click();
      await expect(page.getByTestId('silent-hint')).toBeVisible();
      await page.screenshot({ path: `test-results/screens/app-silent-hint-${scheme}.png` });
      await page.setViewportSize({ width: 320, height: 640 });
      await page.screenshot({ path: `test-results/screens/app-silent-hint-320-${scheme}.png` });
    });
  }
});

// M5 screens: Path cards, Progress, Settings, sheets, broken data, update banner.
for (const scheme of ['light', 'dark'] as const) {
  test(`M5 screens, ${scheme} mode`, async ({ page }) => {
    test.slow();
    const shot = (name: string, fullPage = false) =>
      page.screenshot({ path: `test-results/screens/m5-${name}-${scheme}.png`, fullPage });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    // more than 30 days after the fixture's last backup, so the reminder shows
    await page.clock.setFixedTime(new Date('2026-11-10T10:00:00'));

    await seedProgress(page, fixtureProgress());
    await expect(page.getByTestId('backup-reminder')).toBeVisible();
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await shot('path-backup-reminder');

    await page.goto('./#/progress');
    await expect(page.getByTestId('total-xp')).toBeVisible();
    await page.locator('[data-card="treble-G4"]').click();
    await shot('progress', true);
    await page.setViewportSize({ width: 320, height: 640 });
    await shot('progress-320', true);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('./#/settings');
    await expect(page.getByTestId('last-backup')).toBeVisible();
    await shot('settings', true);
    await page.setViewportSize({ width: 320, height: 640 });
    await shot('settings-320', true);
    await page.setViewportSize({ width: 390, height: 844 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save a backup' }).click();
    const text = readFileSync(await (await download).path(), 'utf8');
    await page.getByTestId('import-input').setInputFiles({
      name: 'b.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text),
    });
    await expect(page.getByRole('dialog', { name: 'Restore this backup?' })).toBeVisible();
    await shot('import-preview');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByTestId('import-input').setInputFiles({
      name: 'x.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    });
    await expect(page.getByText("That file isn't a Sheet Music 101 backup.")).toBeVisible();
    await shot('import-error-toast');

    await page.getByRole('button', { name: 'Start over' }).click();
    await shot('start-over-1');
    await page.getByRole('button', { name: 'Continue without backup' }).click();
    await shot('start-over-2');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await page.evaluate(() => {
      const fire: unknown = Reflect.get(window, '__e2eFireControllerChange');
      if (typeof fire === 'function') fire();
    });
    await expect(page.getByTestId('update-banner')).toBeVisible();
    await shot('update-banner');

    await seedRecord(page, { rev: 7, savedAt: '2026-10-12T10:00:00.000Z', doc: 'garbage' });
    await expect(page.getByTestId('broken-screen')).toBeVisible();
    await shot('broken');
    await page.setViewportSize({ width: 320, height: 640 });
    await shot('broken-320');
  });
}

test.describe('on an iPhone (M5)', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  for (const scheme of ['light', 'dark'] as const) {
    test(`install card and Settings, ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto('./');
      await page.getByRole('button', { name: "Let's start" }).click();
      await expect(page.getByTestId('install-card')).toBeVisible();
      await page.screenshot({ path: `test-results/screens/m5-path-install-ios-${scheme}.png` });
      await page.setViewportSize({ width: 320, height: 640 });
      await page.screenshot({ path: `test-results/screens/m5-path-install-ios-320-${scheme}.png` });
      await page.goto('./#/settings');
      await expect(page.getByTestId('settings-silent-hint')).toBeVisible();
      await page.screenshot({
        path: `test-results/screens/m5-settings-ios-${scheme}.png`,
        fullPage: true,
      });
    });
  }
});
