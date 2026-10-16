import { test, expect } from './fixtures';

// M9: the Gallery's "Part 2" section (music in boxes, black keys). Counts come from CURRICULUM §9.
const BLOCK_COUNTS: Record<string, number> = {
  'part-2-melodies-treble': 12,
  'part-2-melodies-signs': 10,
  'part-2-melodies-bass': 8,
  'part-2-melodies-home': 16,
  'part-2-melodies-natural': 4,
  'part-2-melodies-grand': 6,
  'part-2-rhythm-ra': 6 + 3,
  'part-2-rhythm-rd': 8 + 4,
  'part-2-rhythm-rr': 12 + 7,
  'part-2-rhythm-re': 11 + 8,
  'part-2-stacks': 6 + 5 + 3,
};

test.beforeEach(async ({ page }) => {
  await page.goto('./#/gallery');
  await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible();
});

test('every library item is drawn', async ({ page }) => {
  for (const [id, count] of Object.entries(BLOCK_COUNTS))
    await expect(page.locator(`[data-section="${id}"]`).getByTestId('music'), id).toHaveCount(
      count,
    );
  await expect(page.getByTestId('gallery-glyph')).toHaveCount(16);
});

test('the marker, the empty slot and the states are drawn', async ({ page }) => {
  const marks = page.locator('[data-section="part-2-marks"]');
  await expect(marks.getByTestId('music-marker')).toHaveCount(5);
  await expect(marks.getByTestId('music-empty-slot')).toHaveCount(1);
  await expect(marks.locator('[data-note-state="correct"]').first()).toBeVisible();
  await expect(marks.locator('[data-note-state="wrong"]').first()).toBeVisible();
  // the label never reveals which note is marked
  await expect(
    marks.getByRole('img', { name: 'Music with 2 boxes, one note marked' }).first(),
  ).toBeVisible();
});

test('stems follow the rule: up below the middle line, down from it', async ({ page }) => {
  // t1 is C4 D4 E4 F4 (all below the middle line); s2 starts B4 (middle line).
  const t1 = page.locator('[data-section="part-2-melodies-treble"] [data-testid="music"]').first();
  const heads = t1.locator('g[data-note-position]');
  await expect(heads.first()).toHaveAttribute('data-note-position', '-2');
  const stem = heads.first().locator('rect');
  const box = await stem.boundingBox();
  const head = await heads.first().locator('path').nth(0).boundingBox();
  expect(box && head && box.y + box.height <= head.y + head.height).toBe(true); // stem rises above the head
  const s2 = page.locator('[data-section="part-2-melodies-signs"] [data-testid="music"]').nth(1);
  const b4 = s2.locator('g[data-note-position="4"]').first();
  const stemB = await b4.locator('rect').boundingBox();
  const headB = await b4.locator('path').last().boundingBox();
  expect(stemB && headB && stemB.y >= headB.y).toBe(true); // stem hangs below
});

test('black keys have names, report their MIDI number and show states', async ({ page }) => {
  const block = page.locator('[data-section="part-2-keyboard"]');
  const kb = block.getByTestId('keyboard').first();
  for (const name of ['C♯ / D♭', 'D♯ / E♭', 'F♯ / G♭', 'G♯ / A♭', 'A♯ / B♭'])
    await expect(kb.getByRole('button', { name }).first()).toBeVisible();
  await kb.getByRole('button', { name: 'F♯ / G♭' }).first().click();
  await expect(page.getByTestId('last-black')).toHaveText('Last black key: 54');
  await kb.getByRole('button', { name: 'D♯ / E♭' }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('last-black')).toHaveText('Last black key: 51');
  await expect(kb.locator('[data-black="54"]')).toHaveAttribute('data-key-state', 'highlight');
  await expect(kb.locator('[data-black="61"]')).toHaveAttribute('data-key-state', 'wrong');
  await kb.getByRole('button', { name: 'C', exact: true }).first().click();
  await expect(page.getByTestId('last-black')).toHaveText('Last black key: C3');
});

for (const width of [390, 320]) {
  test(`every row keeps a staff space of 9 px or more at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./#/gallery');
    await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible();
    const small = await page.evaluate(() => {
      const bad: string[] = [];
      for (const svg of document.querySelectorAll('[data-testid="music-row"]')) {
        const vb = svg.getAttribute('viewBox')?.split(' ').map(Number)[2] ?? 1;
        const space = (svg.getBoundingClientRect().width * 10) / vb;
        if (space < 9) bad.push(String(space));
      }
      return bad;
    });
    expect(small).toEqual([]);
  });
}

test('two 4-beat boxes wrap onto two rows on a 320 px phone, one row on 390 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('./#/gallery');
  const first = page
    .locator('[data-section="part-2-melodies-treble"] [data-testid="music"]')
    .first();
  await expect(first).toHaveAttribute('data-rows', '2');
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(first).toHaveAttribute('data-rows', '1');
});
