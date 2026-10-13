import { test, expect } from './fixtures';
import {
  answerQuestion,
  playLesson,
  progressAfter,
  readStored,
  seedProgress,
  seedRecord,
  startFresh,
} from './helpers';

test('progress survives a reload', async ({ page }) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('xp-value')).toHaveText('15');
  await page.reload();
  await expect(page.getByTestId('xp-value')).toHaveText('15');
  await expect(page.getByTestId('bubble-u1-l1')).toHaveAttribute('data-state', 'completed');
  await expect(page.getByTestId('bubble-u1-l2')).toHaveAttribute('data-state', 'current');
  // and the Welcome screen does not come back
  await expect(page.getByRole('button', { name: "Let's start" })).toHaveCount(0);
});

test('daily goal: the ring fills, empties the next day, and days practised only grows on practice days', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00'));
  await startFresh(page);
  const ring = page.getByRole('img', { name: /^Daily goal/ });
  await expect(ring).toHaveAttribute('aria-label', 'Daily goal: 0 of 1 lessons');
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(ring).toHaveAttribute('aria-label', 'Daily goal: 1 of 1 lessons');
  await expect(page.getByTestId('days-value')).toHaveText('1');

  // the next morning
  await page.clock.setFixedTime(new Date('2026-10-15T09:00:00'));
  await page.reload();
  await expect(ring).toHaveAttribute('aria-label', 'Daily goal: 0 of 1 lessons');
  await expect(page.getByTestId('days-value')).toHaveText('1'); // opening the app is not practice
  await page.getByTestId('bubble-u1-l2').click();
  await playLesson(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(ring).toHaveAttribute('aria-label', 'Daily goal: 1 of 1 lessons');
  await expect(page.getByTestId('days-value')).toHaveText('2');
});

test('when the browser blocks storage a warning shows and lessons stay playable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
  });
  await page.goto('./');
  await expect(page.getByTestId('storage-warning')).toContainText(
    "This browser won't let the app save progress",
  );
  await page.getByRole('button', { name: "Let's start" }).click();
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await expect(page.getByRole('heading', { name: 'Perfect lesson!' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('xp-value')).toHaveText('15');
  await expect(page.getByTestId('storage-warning')).toBeVisible();
});

test('unreadable saved data is never overwritten: the app says so and leaves it alone', async ({
  page,
}) => {
  const record = { rev: 7, savedAt: '2026-10-12T10:00:00.000Z', doc: 'garbage' };
  await seedRecord(page, record);
  await expect(
    page.getByRole('heading', { name: "We couldn't read your saved progress." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: "We couldn't read your saved progress." }),
  ).toBeVisible();
  expect(await readStored(page)).toEqual(record);
});

test('a damaged but repairable save is repaired in memory and the learner is told', async ({
  page,
}) => {
  const doc = progressAfter(2) as unknown as Record<string, unknown>;
  doc['xp'] = 'lots';
  await seedRecord(page, { rev: 3, savedAt: '2026-10-12T10:00:00.000Z', doc });
  await expect(page.getByTestId('toast')).toHaveText(
    'Some saved data was damaged and has been repaired.',
  );
  await expect(page.getByTestId('xp-value')).toHaveText('0');
  await expect(page.getByTestId('bubble-u1-l3')).toHaveAttribute('data-state', 'current');
});

test('reloading in the middle of a lesson saves nothing and restarts the lesson', async ({
  page,
}) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await page.getByRole('button', { name: 'Got it' }).click();
  await answerQuestion(page, true);
  await page.reload();
  await expect(page.getByTestId('concept-card')).toBeVisible(); // back at the start of the lesson
  await page.getByRole('button', { name: 'Close lesson' }).click();
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByTestId('xp-value')).toHaveText('0');
});

test('a double tap on an answer counts once', async ({ page }) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await page.getByRole('button', { name: 'Got it' }).click();
  const q = page.getByTestId('question');
  const right = JSON.parse((await q.getAttribute('data-answer')) ?? '{}') as { letter: string };
  await q.getByRole('button', { name: right.letter, exact: true }).dblclick();
  await expect(page.getByTestId('feedback')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute(
    'aria-valuenow',
    '1',
  );
});

test('the lessons also work offline once loaded', async ({ page, context }) => {
  await startFresh(page);
  await context.setOffline(true);
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('xp-value')).toHaveText('15');
});

test('nothing overflows sideways at 320px (welcome, path, cards, questions, feedback)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.goto('./');
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: "Let's start" }).click();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await seedProgress(page, progressAfter(4));
  await page.getByTestId('bubble-u2-l1').click();
  for (let i = 0; i < 3; i++) {
    expect(await overflow()).toBeLessThanOrEqual(0); // concept card, then each Meet card
    await page.getByRole('button', { name: 'Got it' }).click();
  }
  expect(await overflow()).toBeLessThanOrEqual(0);
  await answerQuestion(page, false);
  await expect(page.getByTestId('feedback')).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
});
