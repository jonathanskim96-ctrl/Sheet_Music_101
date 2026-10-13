import { test, expect } from './fixtures';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Hand-written expectation: y of a whole note on a staff whose bottom line is at y = 70. */
function expectedY(card: string): number {
  const match = /^(treble|bass)-([A-G])(\d)$/.exec(card);
  if (!match) throw new Error(card);
  const [, clef, letter, octave] = match;
  const diatonic = Number(octave) * 7 + LETTERS.indexOf(letter);
  const position = diatonic - (clef === 'treble' ? 30 : 18);
  return 70 - position * 5;
}

test.beforeEach(async ({ page }) => {
  await page.goto('./#/gallery');
  await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible();
});

test('renders a staff for each of the 34 cards, with its letter underneath', async ({ page }) => {
  const cards = page.getByTestId('gallery-card');
  await expect(cards).toHaveCount(34);
  const first = cards.first();
  await expect(first).toHaveAttribute('data-card', 'treble-A3');
  await expect(first).toContainText('A');
});

test('every note is drawn on the line or space that matches its name', async ({ page }) => {
  const cards = page.getByTestId('gallery-card');
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const id = (await card.getAttribute('data-card')) ?? '';
    const transform = await card.locator('svg path').last().getAttribute('transform');
    const match = /^translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform ?? '');
    expect(match, id).not.toBeNull();
    expect(Number(match?.[2]), id).toBeCloseTo(expectedY(id), 6);
  }
});

test('tapping a keyboard key shows which key was pressed', async ({ page }) => {
  const keyboard = page.getByTestId('keyboard').first();
  await keyboard.locator('[data-note="C4"]').click();
  await expect(page.getByTestId('last-key')).toHaveText('Last key: C4');
  await keyboard.getByRole('button', { name: 'Black key' }).first().click();
  await expect(page.getByTestId('last-key')).toHaveText('Last key: black');
});

test('a two-octave keyboard is about 150 px tall on a phone (SPEC 7.4)', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'phone size only');
  const box = await page.getByTestId('keyboard').first().boundingBox();
  expect(box?.height).toBeGreaterThan(135);
  expect(box?.height).toBeLessThan(165);
});

test('keys can be pressed with the keyboard', async ({ page }) => {
  const key = page.getByTestId('keyboard').first().locator('[data-note="E3"]');
  await key.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('last-key')).toHaveText('Last key: E3');
});

test('tapping the staff reports the position, from the band or the keyboard', async ({ page }) => {
  const band = (n: number) =>
    page.getByRole('button', { name: `Position ${String(n)}`, exact: true });
  await band(5).click();
  await expect(page.getByTestId('last-position')).toHaveText('Last position: 5');
  // the ghost note lands on the tapped position (p = 5 → y = 70 - 5 × 5)
  const ghost = page.getByRole('group', { name: 'Tappable staff' }).locator('path').last();
  await expect(ghost).toHaveAttribute('transform', /^translate\([-\d.]+ 45\)/);
  await band(-4).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('last-position')).toHaveText('Last position: -4');
  await expect(page.getByRole('button', { name: /^Position / })).toHaveCount(17);
});

test('the sheet traps focus, closes with Escape and returns focus', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Open a sheet' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Leave this lesson?' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep going' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Keep going' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('stacked sheets: Escape closes only the top one and the page stays inert', async ({
  page,
}) => {
  const inert = () => page.evaluate(() => document.getElementById('root')?.inert === true);
  const stackOpener = page.getByRole('button', { name: 'Open stacked sheets' });
  await stackOpener.click();
  const first = page.getByRole('dialog', { name: 'First sheet' });
  const second = page.getByRole('dialog', { name: 'Are you sure?' });
  const opener = page.getByRole('button', { name: 'Open a second sheet' });
  await opener.click();
  await expect(second).toBeVisible();
  expect(await inert()).toBe(true);

  await page.keyboard.press('Escape');
  await expect(second).toBeHidden();
  await expect(first).toBeVisible();
  expect(await inert()).toBe(true);
  await expect(opener).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(first).toBeHidden();
  expect(await inert()).toBe(false);
  await expect(stackOpener).toBeFocused();
});

test('confetti appears and goes away by itself', async ({ page }) => {
  await page.getByRole('button', { name: 'Fire confetti' }).click();
  await expect(page.getByTestId('confetti')).toBeVisible();
  await expect(page.getByTestId('confetti')).toBeHidden({ timeout: 5000 });
});

test('unknown routes show home and redirect to #/', async ({ page }) => {
  for (const bad of ['#/nothing-here', '#/lesson/a/b', '#/gallery/extra']) {
    await page.goto(`./${bad}`);
    await expect(page.getByRole('heading', { name: 'Sheet Music 101' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.location.hash), bad).toBe('#/');
  }
});
