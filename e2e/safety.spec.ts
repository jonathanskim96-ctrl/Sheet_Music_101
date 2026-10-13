import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { fireControllerChange, readStored, seedRecord, startFresh } from './helpers';

const BROKEN = { rev: 7, savedAt: '2026-10-12T10:00:00.000Z', doc: 'garbage' };
const HEADING = "We couldn't read your saved progress.";

test('broken saved data: the screen offers a download of exactly what is stored, and changes nothing', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00'));
  await seedRecord(page, BROKEN);
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download the saved data' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('sheet-music-101-saved-data-2026-10-14.json');
  expect(JSON.parse(readFileSync(await file.path(), 'utf8'))).toEqual(BROKEN);
  expect(await readStored(page)).toEqual(BROKEN);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible();
  expect(await readStored(page)).toEqual(BROKEN);
});

for (const where of ['first', 'second'] as const) {
  test(`broken saved data: Cancel on the ${where} "Start fresh" sheet keeps the data`, async ({
    page,
  }) => {
    await seedRecord(page, BROKEN);
    await page.getByRole('button', { name: 'Start fresh' }).click();
    if (where === 'second') {
      await page.getByRole('button', { name: 'Continue without backup' }).click();
      await expect(page.getByRole('dialog', { name: 'Erase all progress?' })).toBeVisible();
    }
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: HEADING })).toBeVisible();
    expect(await readStored(page)).toEqual(BROKEN);
  });
}

test('broken saved data: "Start fresh" after both sheets replaces it with a new start', async ({
  page,
}) => {
  await seedRecord(page, BROKEN);
  await page.getByRole('button', { name: 'Start fresh' }).click();
  await page.getByRole('button', { name: 'Continue without backup' }).click();
  await page.getByRole('button', { name: 'Erase everything' }).click();
  await expect(page.getByRole('button', { name: "Let's start" })).toBeVisible();
  const stored = (await readStored(page)) as { rev: number; doc: { xp: number } };
  expect(stored.rev).toBe(8);
  expect(stored.doc.xp).toBe(0);
  await page.getByRole('button', { name: "Let's start" }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
});

test('the update banner appears when a new version takes over, and Reload reloads', async ({
  page,
}) => {
  await startFresh(page);
  await expect(page.getByTestId('update-banner')).toHaveCount(0);
  await fireControllerChange(page);
  const banner = page.getByTestId('update-banner');
  await expect(banner).toHaveText(/A new version is ready\./);
  await banner.getByRole('button', { name: 'Reload' }).click();
  await expect(page.getByTestId('bubble-u1-l1')).toBeVisible();
  await expect(page.getByTestId('update-banner')).toHaveCount(0);
});

test('the first service worker taking control is not an update', async ({ page }) => {
  await page.goto('./');
  // wait for the first install to finish and claim the page
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await expect(page.getByTestId('update-banner')).toHaveCount(0);
});

test('an error that escapes a handler is shown in a toast', async ({ page, consoleErrors }) => {
  await startFresh(page);
  await page.evaluate(() => {
    void Promise.reject(new Error('Test failure'));
  });
  await expect(page.getByTestId('toast')).toHaveText('Something went wrong: Test failure');
  // The page error is the point of this test; nothing else may have been logged.
  expect(consoleErrors.every((e) => e.includes('Test failure'))).toBe(true);
  consoleErrors.length = 0;
});

test('broken saved data that cannot even be read: "Save backup" in the Start fresh sheet is disabled and says why', async ({
  page,
}) => {
  // Every read of the object store fails (writes still work, so the record can be seeded).
  await page.addInitScript(() => {
    IDBObjectStore.prototype.get = function () {
      throw new DOMException('Disk read failed', 'UnknownError');
    };
  });
  await seedRecord(page, BROKEN);
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download the saved data' })).toBeDisabled();
  await page.getByRole('button', { name: 'Start fresh' }).click();
  const sheet = page.getByRole('dialog', { name: 'Save a backup first?' });
  await expect(sheet.getByRole('alert')).toHaveText(
    "The saved data can't be downloaded: Disk read failed",
  );
  await expect(sheet.getByRole('button', { name: 'Save backup' })).toBeDisabled();
  await sheet.getByRole('button', { name: 'Cancel' }).click();
});
