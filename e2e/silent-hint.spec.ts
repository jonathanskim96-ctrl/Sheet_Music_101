import { pathLessons } from '../src/domain/curriculum';
import { test, expect } from './fixtures';
import { answerQuestion, progressAfter, seedProgress, startFresh } from './helpers';

const HINT = "No sound? Check that your iPhone isn't on Silent.";
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

test.describe('on an iPhone', () => {
  test.use({ userAgent: IPHONE_UA });

  test('the Silent-mode hint shows on the first screen of a lesson and goes after "Got it"', async ({
    page,
  }) => {
    await startFresh(page);
    await page.getByTestId('bubble-u1-l1').click();
    await expect(page.getByTestId('silent-hint')).toHaveText(HINT);
    await page.getByRole('button', { name: 'Got it' }).first().click();
    await expect(page.getByTestId('silent-hint')).toHaveCount(0);

    // At most once per app run: not in the next lesson, but again after a reload (a new run).
    await page.getByRole('button', { name: 'Close lesson' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();
    await page.getByTestId('bubble-u1-l1').click();
    await expect(page.getByRole('button', { name: 'Got it' }).first()).toBeVisible();
    await expect(page.getByTestId('silent-hint')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('silent-hint')).toHaveText(HINT);
  });

  test('the hint goes after the first answer when a lesson starts with a question', async ({
    page,
  }) => {
    // u2-l3 has no concept or Meet cards: its first screen is a question.
    await seedProgress(page, progressAfter(pathLessons().findIndex((l) => l.id === 'u2-l3')));
    await page.getByTestId('bubble-u2-l3').click();
    await expect(page.getByTestId('question')).toBeVisible();
    await expect(page.getByTestId('silent-hint')).toHaveText(HINT);
    await answerQuestion(page, true);
    await expect(page.getByTestId('silent-hint')).toHaveCount(0);
  });

  test('the hint waits while sound is off, and shows once sound is turned on', async ({ page }) => {
    await seedProgress(
      page,
      progressAfter(0, (p) => {
        p.settings.soundOn = false;
      }),
    );
    await page.getByTestId('bubble-u1-l1').click();
    await expect(page.getByRole('button', { name: 'Got it' }).first()).toBeVisible();
    await expect(page.getByTestId('silent-hint')).toHaveCount(0);
    // Not used up while hidden: still off in the next lesson, then turning sound on shows it.
    await page.getByRole('button', { name: 'Close lesson' }).click();
    await page.getByRole('button', { name: 'Leave' }).click();
    await page.getByTestId('bubble-u1-l1').click();
    await expect(page.getByTestId('silent-hint')).toHaveCount(0);
    await page.getByRole('button', { name: 'Turn sound on' }).click();
    await expect(page.getByTestId('silent-hint')).toHaveText(HINT);
  });
});

test('no Silent-mode hint with the default user agent', async ({ page }) => {
  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await expect(page.getByRole('button', { name: 'Got it' }).first()).toBeVisible();
  await expect(page.getByTestId('silent-hint')).toHaveCount(0);
});
