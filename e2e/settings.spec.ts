import { test, expect } from './fixtures';
import { fixtureProgress, progressAfter, readStored, seedProgress, startFresh } from './helpers';

test('daily goal: choosing 2 in Settings makes the ring show 0 of 2', async ({ page }) => {
  await startFresh(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  const two = page.getByRole('button', { name: '2 lessons a day' });
  await two.click();
  await expect(two).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('img', { name: /^Daily goal/ })).toHaveAttribute(
    'aria-label',
    'Daily goal: 0 of 2 lessons',
  );
  await page.reload();
  await expect(page.getByRole('img', { name: /^Daily goal/ })).toHaveAttribute(
    'aria-label',
    'Daily goal: 0 of 2 lessons',
  );
});

test('the sound switch is saved across a reload and mutes the lesson', async ({ page }) => {
  await startFresh(page);
  await page.goto('./#/settings');
  const sound = page.getByRole('switch', { name: 'Sound' });
  await expect(sound).toHaveAttribute('aria-checked', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  const stored = (await readStored(page)) as { doc: { settings: { soundOn: boolean } } };
  expect(stored.doc.settings.soundOn).toBe(false);
  // the lesson header agrees
  await page.goto('./#/');
  await page.getByTestId('bubble-u1-l1').click();
  await expect(page.getByRole('button', { name: 'Turn sound on' })).toBeVisible();
});

test('Settings shows backup, storage and about information', async ({ page }) => {
  await startFresh(page);
  await page.goto('./#/settings');
  await expect(page.getByTestId('last-backup')).toHaveText('Last backup: never');
  await expect(page.getByTestId('storage-status')).toHaveText(
    /^(Protected|Not protected yet\. Installing the app helps\.)$/,
  );
  await expect(page.getByTestId('about-version')).toContainText('Sheet Music 101 version 0.1.0');
  await expect(
    page.getByText('Music symbols: Bravura by Steinberg, SIL Open Font License'),
  ).toBeVisible();
  // not installed, no install prompt offered: the browser-menu tip
  await expect(
    page.getByText("Use your browser's menu to add this app to your home screen."),
  ).toBeVisible();
  // not on an iPhone: no Silent-mode hint
  await expect(page.getByTestId('settings-silent-hint')).toHaveCount(0);
});

test('the back buttons return to the path', async ({ page }) => {
  await startFresh(page);
  await page.getByRole('button', { name: 'Progress' }).click();
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
});

test.describe('on an iPhone', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test('Settings shows the Silent hint and the Share steps', async ({ page }) => {
    await startFresh(page);
    await page.goto('./#/settings');
    await expect(page.getByTestId('settings-silent-hint')).toHaveText(
      "No sound? Check that your iPhone isn't on Silent.",
    );
    await expect(page.getByText("Tap the Share button, then 'Add to Home Screen'.")).toBeVisible();
  });

  test('the install card shows the Share steps; "Not now" hides it for 7 days', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-14T10:00:00'));
    await startFresh(page);
    const card = page.getByTestId('install-card');
    await expect(card).toContainText("Tap the Share button, then 'Add to Home Screen'.");
    await expect(card.getByRole('button', { name: 'Install' })).toHaveCount(0);
    await card.getByRole('button', { name: 'Not now' }).click();
    await expect(card).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
    await expect(card).toHaveCount(0);
    // a week later it is back
    await page.clock.setFixedTime(new Date('2026-10-21T10:00:00'));
    await page.reload();
    await expect(card).toBeVisible();
  });
});

test('the install card offers Install when the browser allows it', async ({ page }) => {
  await startFresh(page);
  await expect(page.getByTestId('install-card')).toHaveCount(0);
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(e, 'prompt', {
      value: () => {
        Reflect.set(window, 'installPrompted', true);
        return Promise.resolve();
      },
    });
    window.dispatchEvent(e);
  });
  const card = page.getByTestId('install-card');
  await card.getByRole('button', { name: 'Install' }).click();
  expect(await page.evaluate(() => Reflect.get(window, 'installPrompted'))).toBe(true);
  // the prompt can only be used once, so the card has nothing left to offer
  await expect(card).toHaveCount(0);
});

test('the backup reminder appears after 5 lessons; "Later" hides it until the app reopens', async ({
  page,
}) => {
  await seedProgress(
    page,
    progressAfter(5, (p) => {
      p.totals.lessonsDone = 5;
    }),
  );
  const card = page.getByTestId('backup-reminder');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Later' }).click();
  await expect(card).toHaveCount(0);
  // still hidden when coming back to the path in the same visit
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByTestId('last-backup')).toHaveText('Last backup: never');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(card).toBeVisible();
});

test('the backup reminder\'s "Save backup" saves a file and the card goes away', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00'));
  await seedProgress(
    page,
    progressAfter(5, (p) => {
      p.totals.lessonsDone = 5;
    }),
  );
  const card = page.getByTestId('backup-reminder');
  const download = page.waitForEvent('download');
  await card.getByRole('button', { name: 'Save backup' }).click();
  expect((await download).suggestedFilename()).toBe('sheet-music-101-backup-2026-10-14.json');
  await expect(card).toHaveCount(0);
  await page.goto('./#/settings');
  await expect(page.getByTestId('last-backup')).toHaveText('Last backup: today');
});

test('Progress shows the totals, the mastery chart and level stars', async ({ page }) => {
  const p = fixtureProgress();
  await seedProgress(page, p);
  await page.goto('./#/progress');
  await expect(page.getByTestId('total-xp')).toHaveText(String(p.xp));
  await expect(page.getByTestId('total-days')).toHaveText(String(p.daysPracticed.length));
  await expect(page.getByTestId('total-lessons')).toHaveText(
    String(Object.keys(p.lessons).filter((id) => !id.startsWith('cp-')).length),
  );
  const accuracy = Math.round((p.totals.correctFirstTry / p.totals.questionsAnswered) * 100);
  await expect(page.getByTestId('total-accuracy')).toHaveText(`${String(accuracy)}%`);

  // 34 notes, each tappable with its own description
  const notes = page.locator('[data-card]');
  await expect(notes).toHaveCount(34);
  const g4 = p.cards['treble-G4'];
  expect(g4).toBeDefined();
  await page.locator('[data-card="treble-G4"]').click();
  await expect(page.getByTestId('mastery-tooltip')).toHaveText(
    new RegExp(
      `^Treble G · (Learning|Almost|Known) · ${String(g4?.correct)}/${String(g4?.seen)} correct$`,
    ),
  );
  await page.locator('[data-card="bass-C2"]').click();
  await expect(page.getByTestId('mastery-tooltip')).toHaveText('Low C · New');
  for (const word of ['New', 'Learning', 'Almost', 'Known']) {
    await expect(page.getByRole('list', { name: 'Legend' }).getByText(word)).toBeVisible();
  }
  await expect(page.getByTestId('level-stars')).toHaveCount(4);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("unit level stars on the path fill when a unit's lessons are done", async ({ page }) => {
  await seedProgress(page, progressAfter(4)); // all of unit 1
  const unit1 = page.getByRole('region', { name: 'Unit 1' });
  await expect(unit1.getByTestId('level-stars')).toHaveAttribute('data-level', '1');
  await expect(unit1.getByRole('img', { name: '1 of 1 star' })).toBeVisible();
  const unit2 = page.getByRole('region', { name: 'Unit 2' });
  await expect(unit2.getByRole('img', { name: '0 of 3 stars' })).toBeVisible();
  // practice arrives with M6: no Practise button yet
  await expect(page.getByRole('button', { name: 'Practise' })).toHaveCount(0);
});
