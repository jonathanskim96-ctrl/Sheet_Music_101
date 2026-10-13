import { test, expect } from './fixtures';

// main.tsx must install the first-tap unlock (SPEC 7.7): a tap that plays no sound still
// creates the engine inside that tap. (Detaching and rebuilding are unit-tested; here a slow
// runner could legitimately rebuild a not-yet-running engine, so only the first tap is checked.)
test('the first tap anywhere starts the sound engine', async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    let made = 0;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        made++;
      }
    };
    Object.defineProperty(window, 'audioContextsMade', { get: () => made });
  });
  const made = () => page.evaluate(() => Reflect.get(window, 'audioContextsMade') as number);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Sheet Music 101' })).toBeVisible();
  expect(await made()).toBe(0);
  await page.getByRole('button', { name: "Let's start" }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
  expect(await made()).toBeGreaterThanOrEqual(1);
});
