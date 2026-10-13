import { test, expect } from './fixtures';
import {
  answerQuestion,
  fixtureProgress,
  playLesson,
  progressAfter,
  seedProgress,
  startFresh,
} from './helpers';

const xp = (page: import('@playwright/test').Page) => page.getByTestId('xp-value');

test('first run: Welcome, then the Path with unit 1 lesson 1 current and the rest locked', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Sheet Music 101' })).toBeVisible();
  await expect(page.getByText("Hi, I'm Quaver!")).toBeVisible();
  await page.getByRole('button', { name: "Let's start" }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toHaveAttribute('data-state', 'current');
  for (const id of ['u1-l2', 'u1-l3', 'u1-l4', 'u2-l1', 'u4-l5']) {
    await expect(page.getByTestId(`bubble-${id}`)).toHaveAttribute('data-state', 'locked');
  }
  await expect(xp(page)).toHaveText('0');
});

test('a perfect first lesson: +15 XP, Path moves on, one day practised', async ({ page }) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await playLesson(page);
  await expect(page.getByRole('heading', { name: 'Perfect lesson!' })).toBeVisible();
  await expect(page.getByTestId('stat-xp')).toHaveText('+15');
  await expect(page.getByTestId('stat-accuracy')).toHaveText('100%');
  await expect(page.getByTestId('goal-banner')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toHaveAttribute('data-state', 'completed');
  await expect(page.getByTestId('bubble-u1-l2')).toHaveAttribute('data-state', 'current');
  await expect(xp(page)).toHaveText('15');
  await expect(page.getByTestId('days-value')).toHaveText('1');
});

test('a wrong answer shows the right one and comes back later; accuracy is below 100', async ({
  page,
}) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await page.getByRole('button', { name: 'Got it' }).click(); // concept card
  const first = page.getByTestId('question');
  const right = JSON.parse((await first.getAttribute('data-answer')) ?? '{}') as { letter: string };
  const prompt = await first.getByRole('heading').textContent();
  // answer the first question wrongly
  await answerQuestion(page, false);
  await expect(page.getByTestId('feedback')).toContainText(`${right.letter}.`);
  await page.getByRole('button', { name: 'Continue' }).click();
  // the rest are answered correctly; the missed question must come back (8 + 1 screens in total)
  const shown = 1 + (await playLesson(page));
  expect(shown).toBe(9);
  expect(prompt).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  await expect(page.getByTestId('stat-accuracy')).toHaveText('88%');
  await expect(page.getByTestId('stat-xp')).toHaveText('+10');
});

test('leaving a lesson through the X saves nothing', async ({ page }) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await page.getByRole('button', { name: 'Got it' }).click();
  await answerQuestion(page, true);
  await page.getByRole('button', { name: 'Close lesson' }).click();
  const sheet = page.getByRole('dialog', { name: 'Leave this lesson?' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Keep going' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId('feedback')).toBeVisible(); // still in the lesson
  await page.getByRole('button', { name: 'Close lesson' }).click();
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toHaveAttribute('data-state', 'current');
  await expect(xp(page)).toHaveText('0');
  await expect(page.getByTestId('days-value')).toHaveText('0');
});

test('tapping a locked lesson shows a toast and does not open it', async ({ page }) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l3').click({ force: true }); // aria-disabled, but still tappable
  await expect(page.getByTestId('toast')).toHaveText('Finish the lesson before this one first.');
  await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
  expect(await page.evaluate(() => window.location.hash)).not.toContain('lesson');
});

test('a locked lesson typed into the address bar goes home', async ({ page }) => {
  await startFresh(page);
  await page.goto('./#/lesson/u3-l2');
  await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/');
});

test('Meet cards appear in u2-l1 for Middle C and Treble G, and not on replay', async ({
  page,
}) => {
  await seedProgress(page, progressAfter(4));
  await expect(page.getByTestId('bubble-u2-l1')).toHaveAttribute('data-state', 'current');
  await page.getByTestId('bubble-u2-l1').click();
  await expect(page.getByTestId('concept-card')).toHaveAttribute('data-card', 'c-landmarks');
  await page.getByRole('button', { name: 'Got it' }).click();
  const meet = page.getByTestId('meet-card');
  await expect(meet).toHaveAttribute('data-card', 'treble-C4');
  await expect(meet.getByRole('heading', { name: 'Middle C' })).toBeVisible();
  await expect(meet).toContainText('It sits on ledger line 1 below the staff.');
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(meet).toHaveAttribute('data-card', 'treble-G4');
  await expect(meet.getByRole('heading', { name: 'Treble G' })).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByTestId('question')).toBeVisible();
  await playLesson(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  // replay: the concept card shows again, the Meet cards do not
  await page.getByTestId('bubble-u2-l1').click();
  await expect(page.getByTestId('concept-card')).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByTestId('meet-card')).toHaveCount(0);
  await expect(page.getByTestId('question')).toBeVisible();
});

test('the wrong answer in a note lesson explains where the note sits', async ({ page }) => {
  await seedProgress(page, progressAfter(4));
  await page.getByTestId('bubble-u2-l1').click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Got it' }).click();
  await answerQuestion(page, false);
  const feedback = page.getByTestId('feedback');
  await expect(feedback).toHaveAttribute('data-correct', 'false');
  await expect(feedback).toContainText(/It sits on (line 2|ledger line 1 below)/);
});

test('mid-course progress from the fixture shows done, current and locked bubbles', async ({
  page,
}) => {
  await seedProgress(page, fixtureProgress());
  await expect(page.getByTestId('bubble-u4-l2')).toHaveAttribute('data-state', 'completed');
  await expect(page.getByTestId('bubble-u4-l3')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('bubble-u4-l4')).toHaveAttribute('data-state', 'locked');
  await expect(xp(page)).toHaveText('135');
});
