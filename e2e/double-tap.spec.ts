import { test, expect } from './fixtures';
import { startFresh } from './helpers';

// Opus review of M7, item 2: a double tap on an answer must play the sound once, not twice.
// Two taps in the same frame both see the same render, so the reducer alone cannot prevent it.
test('five quick taps on one answer play the same sounds as a single tap', async ({ page }) => {
  await page.addInitScript(() => {
    let started = 0;
    const proto = window.AudioContext.prototype;
    const original: unknown = Reflect.get(proto, 'createOscillator');
    proto.createOscillator = function (this: AudioContext) {
      started++;
      return Reflect.apply(original as () => OscillatorNode, this, []);
    };
    Object.defineProperty(window, 'oscillatorsMade', { get: () => started });
  });
  const made = () => page.evaluate(() => Reflect.get(window, 'oscillatorsMade') as number);

  await startFresh(page);
  await page.getByTestId('bubble-u1-l1').click();
  await page.getByRole('button', { name: 'Got it' }).click();

  const tapRight = async (times: number): Promise<number> => {
    const q = page.getByTestId('question');
    const right = JSON.parse((await q.getAttribute('data-answer')) ?? '{}') as { letter: string };
    const before = await made();
    await q
      .getByRole('button', { name: right.letter, exact: true })
      .evaluate((b: HTMLElement, n: number) => {
        for (let i = 0; i < n; i++) b.click();
      }, times);
    return (await made()) - before;
  };

  const single = await tapRight(1);
  expect(single).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Continue' }).click();
  expect(await tapRight(5)).toBe(single);
});
