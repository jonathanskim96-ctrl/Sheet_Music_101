import { test, expect } from './fixtures';

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
