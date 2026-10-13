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

test('confetti appears and goes away by itself', async ({ page }) => {
  await page.getByRole('button', { name: 'Fire confetti' }).click();
  await expect(page.getByTestId('confetti')).toBeVisible();
  await expect(page.getByTestId('confetti')).toBeHidden({ timeout: 5000 });
});

test('the gallery is not part of unknown routes', async ({ page }) => {
  await page.goto('./#/nothing-here');
  await expect(page.getByRole('heading', { name: 'Sheet Music 101' })).toBeVisible();
});
