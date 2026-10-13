import { test, expect } from './fixtures';
import {
  answerQuestion,
  fixtureProgress,
  playLesson,
  progressAfter,
  seedProgress,
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
