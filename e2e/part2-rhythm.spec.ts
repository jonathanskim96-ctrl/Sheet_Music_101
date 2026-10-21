import type { Page } from '@playwright/test';
import { pathLessons } from '../src/domain/curriculum';
import { test, expect } from './fixtures';
import {
  answerOf,
  answerQuestion,
  finish,
  go,
  playLesson,
  progressAfter,
  reachQuestion,
  seedProgress,
  whatIsShown,
} from './helpers';

const DAY = '2026-10-13';
const ALL_DONE = pathLessons().length; // any lesson can be opened and replayed
const RHYTHM = pathLessons().filter((l) => l.unit >= 16 && l.unit <= 19);

/** Counts the oscillators the app creates, so a test can tell whether anything was played. */
async function spyOnSound(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __osc: number; AudioContext: typeof AudioContext };
    w.__osc = 0;
    const Real = w.AudioContext;
    w.AudioContext = class extends Real {
      override createOscillator(): OscillatorNode {
        w.__osc += 1;
        return super.createOscillator();
      }
    };
  });
}
const oscillators = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __osc: number }).__osc);

test.describe('units 16-19 and checkpoint E (rhythm)', () => {
  test('every rhythm lesson and cp-e opens in order and plays to the end', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the long loop runs on the phone project only');
    test.setTimeout(300_000);
    test.slow();
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(61)); // units 1-15 done: u16-l1 is the current lesson
    await expect(page.getByTestId('bubble-u16-l1')).toHaveAttribute('data-state', 'current');

    for (const lesson of RHYTHM) {
      await go(page, `#/lesson/${lesson.id}`);
      await playLesson(page);
      await finish(page);
      await expect(page.getByTestId(`bubble-${lesson.id}`)).toHaveAttribute(
        'data-state',
        'completed',
      );
    }
    expect(RHYTHM).toHaveLength(18);
    await expect(page.getByTestId('checkpoint-cp-e')).toBeVisible();

    await go(page, '#/checkpoint/cp-e');
    await playLesson(page);
    await expect(page.getByRole('heading', { name: 'Checkpoint passed!' })).toBeVisible();
    await finish(page);
  });

  test('a lesson started with sound off has no listening question', async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(
      page,
      progressAfter(ALL_DONE, (p) => {
        p.settings.soundOn = false;
      }),
    );
    await go(page, '#/lesson/u16-l3'); // R3: 60 % listening when sound is on
    const kinds: string[] = [];
    for (let guard = 0; guard < 80; guard++) {
      const shown = await whatIsShown(page);
      if (shown === 'complete') break;
      if (shown === 'card') await page.getByRole('button', { name: 'Got it' }).click();
      else if (shown === 'feedback') await page.getByRole('button', { name: 'Continue' }).click();
      else {
        kinds.push((await page.getByTestId('question').getAttribute('data-kind')) ?? '');
        await answerQuestion(page, true);
        await expect(page.getByTestId('feedback')).toBeVisible();
      }
    }
    expect(kinds).toHaveLength(10);
    expect(new Set(kinds)).toEqual(new Set(['beats-of']));
  });

  test('muting during a listening question shows "Turn on sound", and the button turns sound on', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(ALL_DONE));
    await go(page, '#/lesson/u16-l3');
    const q = await reachQuestion(page, 'hear-rhythm');
    await expect(q.getByRole('button', { name: 'Play again' })).toBeVisible();
    await expect(page.getByTestId('sound-off')).toHaveCount(0);

    await page.getByRole('button', { name: 'Mute sound' }).click();
    const off = page.getByTestId('sound-off');
    await expect(off).toBeVisible();
    await expect(off).toContainText('Turn on sound to hear this.');
    await expect(q.getByRole('button', { name: 'Play again' })).toHaveCount(0);
    // the options stay answerable while muted
    await expect(q.getByRole('button', { name: 'Top rhythm' })).toBeEnabled();

    await off.getByRole('button', { name: 'Turn on sound' }).click();
    await expect(page.getByTestId('sound-off')).toHaveCount(0);
    await expect(q.getByRole('button', { name: 'Play again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mute sound' })).toBeVisible();

    // and the question can be answered, with the replay line under the feedback
    await answerQuestion(page, true);
    await expect(page.getByTestId('feedback')).toContainText(
      'Tap Play again to hear it once more.',
    );
  });

  test('a listening question plays itself once and "Play again" plays it again; a muted one stays silent', async ({
    page,
  }) => {
    await spyOnSound(page);
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(ALL_DONE));
    await go(page, '#/lesson/u16-l3');
    const q = await reachQuestion(page, 'hear-rhythm');
    // 4 count-in clicks (1 oscillator each) + the notes (4 partials each) were scheduled on appearing
    await expect.poll(() => oscillators(page)).toBeGreaterThanOrEqual(8);
    const afterAuto = await oscillators(page);
    await q.getByRole('button', { name: 'Play again' }).click();
    await expect.poll(() => oscillators(page)).toBeGreaterThan(afterAuto);

    // muted: Play again is gone and nothing new is scheduled
    await page.getByRole('button', { name: 'Mute sound' }).click();
    const muted = await oscillators(page);
    await answerQuestion(page, true);
    await expect(page.getByTestId('feedback')).toBeVisible();
    expect(await oscillators(page)).toBe(muted);
  });

  test('a rhythm concept card has a Play button that plays the picture', async ({ page }) => {
    await spyOnSound(page);
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(61));
    await go(page, '#/lesson/u16-l1');
    const card = page.getByTestId('concept-card');
    await expect(card).toHaveAttribute('data-card', 'c-beat');
    await expect(card.getByTestId('music')).toBeVisible();
    await card.getByRole('button', { name: 'Play' }).click();
    // 4 clicks + 4 notes x 4 partials
    await expect.poll(() => oscillators(page)).toBeGreaterThanOrEqual(20);
    await page.getByRole('button', { name: 'Got it' }).click();
    // c-one-beat has no Play button
    await expect(page.getByTestId('concept-card')).toHaveAttribute('data-card', 'c-one-beat');
    await expect(
      page.getByTestId('concept-card').getByRole('button', { name: 'Play' }),
    ).toHaveCount(0);
  });

  test('a wrong finish-box answer outlines both the right option and the tapped one', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(ALL_DONE));
    await go(page, '#/lesson/u17-l2'); // B2: 70 % finish-box
    const q = await reachQuestion(page, 'finish-box');
    const right = await answerOf(q);
    if (right.kind !== 'option') throw new Error('expected an option answer');
    // the options are named after what they are, and the box shows an empty slot
    await expect(q.getByTestId('music-empty-slot')).toBeVisible();
    const pictures = q.locator('[data-option-index]');
    await expect(pictures).toHaveCount(3);
    for (const name of await pictures.evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label')),
    ))
      expect(name).toMatch(/^(1|2|3|4)-beat (note|rest)$|^half-beat pair$/);

    await answerQuestion(page, false);
    const feedback = page.getByTestId('feedback');
    await expect(feedback).toHaveAttribute('data-correct', 'false');
    await expect(q.locator(`[data-option-index="${String(right.index)}"]`)).toHaveAttribute(
      'data-state',
      'correct',
    );
    await expect(
      q.locator(`[data-option-index="${String((right.index + 1) % 3)}"]`),
    ).toHaveAttribute('data-state', 'wrong');
    await expect(q.locator('[data-state]')).toHaveCount(2);
    await expect(feedback).toContainText(
      /(It's|This one is|The answer is) a (\d-beat (note|rest)|half-beat pair)\./,
    );
    await expect(feedback).toContainText(/\d( \+ \d)+ = \d beats\./);
  });

  test('counting questions: the right button is green, a wrong one is explained with the sum', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(ALL_DONE));
    await go(page, '#/lesson/u17-l4'); // B3: count-box 50 %, no time numbers
    const q = await reachQuestion(page, 'count-box');
    await expect(q.getByTestId('music-top-number')).toHaveCount(0);
    await answerQuestion(page, false);
    const feedback = page.getByTestId('feedback');
    await expect(feedback).toHaveAttribute('data-correct', 'false');
    await expect(feedback).toContainText(/\d( \+ \d)+ = \d beats\./);
  });

  test('the "top number" concept card rings the top number', async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(ALL_DONE));
    await go(page, '#/lesson/u17-l1');
    await page.getByRole('button', { name: 'Got it' }).click(); // c-box
    await expect(page.getByTestId('concept-card')).toHaveAttribute('data-card', 'c-top-number');
    await expect(page.getByTestId('music-top-number')).toBeVisible();
  });

  test('passing cp-e from fresh progress marks units 16-19 done and nothing else', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
    await seedProgress(page, progressAfter(0));
    await go(page, '#/checkpoint/cp-e');
    await playLesson(page);
    await expect(page.getByRole('heading', { name: 'Checkpoint passed!' })).toBeVisible();
    await finish(page);
    for (const l of RHYTHM)
      await expect(page.getByTestId(`bubble-${l.id}`)).toHaveAttribute('data-state', 'completed');
    await expect(page.getByTestId('bubble-u1-l1')).toHaveAttribute('data-state', 'current');
    await expect(page.getByTestId('bubble-u15-l4')).not.toHaveAttribute('data-state', 'completed');
  });

  test('the Path shows units 16-19 in order with the cp-e trophy after unit 19', async ({
    page,
  }) => {
    await seedProgress(page, progressAfter(61));
    for (const n of [16, 17, 18, 19])
      await expect(page.getByLabel(`Unit ${String(n)}`)).toHaveCount(1);
    const positions = await page
      .locator('[data-testid^="bubble-u1"], [data-testid="checkpoint-cp-e"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    const lastLesson = positions.indexOf('bubble-u19-l4');
    expect(lastLesson).toBeGreaterThan(-1);
    expect(positions[lastLesson + 1]).toBe('checkpoint-cp-e');
  });
});
