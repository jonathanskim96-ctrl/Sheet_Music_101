import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { parseBackup } from '../src/domain/backup';
import type { Progress } from '../src/domain/progress';
import { test, expect } from './fixtures';
import { fixtureProgress, readStored, seedProgress } from './helpers';

const DAY = '2026-10-14';

async function saveBackup(page: Page): Promise<{ name: string; text: string }> {
  await page.goto('./#/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save a backup' }).click();
  const file = await download;
  const path = await file.path();
  return { name: file.suggestedFilename(), text: readFileSync(path, 'utf8') };
}

async function chooseFile(page: Page, name: string, text: string | Buffer): Promise<void> {
  await page.getByTestId('import-input').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: typeof text === 'string' ? Buffer.from(text) : text,
  });
}

async function storedDoc(page: Page): Promise<Progress> {
  return ((await readStored(page)) as { doc: Progress }).doc;
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${DAY}T10:00:00`));
});

test('Save a backup downloads a dated file that parses back to the same progress', async ({
  page,
}) => {
  const p = fixtureProgress();
  await seedProgress(page, p);
  const { name, text } = await saveBackup(page);
  expect(name).toBe(`sheet-music-101-backup-${DAY}.json`);
  const parsed = parseBackup(text);
  expect(parsed.ok).toBe(true);
  // the app holds the v1 fixture as version 2 once loaded, so the backup is version 2
  if (parsed.ok) expect(parsed.progress).toEqual({ ...p, schemaVersion: 2 });
  await expect(page.getByTestId('toast')).toHaveText('Backup saved.');
  await expect(page.getByTestId('last-backup')).toHaveText('Last backup: today');
  expect((await storedDoc(page)).flags.lastExportDay).toBe(DAY);
});

test('backup, start over, restore: progress comes back exactly', async ({ page }) => {
  const p = fixtureProgress();
  await seedProgress(page, p);
  const { text } = await saveBackup(page);

  // Start over through both sheets
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('dialog', { name: 'Save a backup first?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue without backup' }).click();
  await expect(page.getByRole('dialog', { name: 'Erase all progress?' })).toBeVisible();
  await page.getByRole('button', { name: 'Erase everything' }).click();
  await expect(page.getByRole('button', { name: "Let's start" })).toBeVisible();
  const erased = await storedDoc(page);
  expect(erased.xp).toBe(0);
  expect(erased.lessons).toEqual({});
  expect(erased.cards).toEqual({});

  // Restore
  await page.getByRole('button', { name: "Let's start" }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await chooseFile(page, `sheet-music-101-backup-${DAY}.json`, text);
  const preview = page.getByRole('dialog', { name: 'Restore this backup?' });
  await expect(preview).toBeVisible();
  const lessons = Object.keys(p.lessons).filter((id) => !id.startsWith('cp-')).length;
  await expect(preview.getByTestId('import-summary')).toHaveText(
    `${String(p.xp)} XP · ${String(lessons)} lessons · ${String(p.daysPracticed.length)} days practised`,
  );
  await expect(preview).toContainText('Saved on');
  await expect(preview).toContainText('This replaces your current progress on this phone.');
  await preview.getByRole('button', { name: 'Replace my progress' }).click();
  await expect(page.getByTestId('toast').filter({ hasText: 'Progress restored.' })).toBeVisible();

  const restored = await storedDoc(page);
  expect(restored.xp).toBe(p.xp);
  expect(restored.lessons).toEqual(p.lessons);
  expect(restored.cards).toEqual(p.cards);
  expect(restored).toEqual({ ...p, schemaVersion: 2 });
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByTestId('xp-value')).toHaveText(String(p.xp));
});

test('Cancel in the import preview changes nothing', async ({ page }) => {
  const p = fixtureProgress();
  await seedProgress(page, p);
  const { text } = await saveBackup(page);
  const before = await readStored(page);
  await chooseFile(page, 'b.json', text);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await readStored(page)).toEqual(before);
});

test('the restore preview offers a backup of the current progress first, and replaces nothing until asked', async ({
  page,
}) => {
  const p = fixtureProgress();
  await seedProgress(page, p);
  const { text } = await saveBackup(page);
  // the file to restore: a different progress
  const other = JSON.parse(text) as { progress: Progress };
  other.progress.xp = 999;
  await chooseFile(page, 'other.json', JSON.stringify(other));
  const preview = page.getByRole('dialog', { name: 'Restore this backup?' });
  const download = page.waitForEvent('download');
  await preview.getByRole('button', { name: 'Save a backup first' }).click();
  const file = await download;
  const saved = parseBackup(readFileSync(await file.path(), 'utf8'));
  expect(saved.ok && saved.progress.xp).toBe(p.xp);
  // still on the preview, nothing replaced yet
  await expect(preview).toBeVisible();
  expect((await storedDoc(page)).xp).toBe(p.xp);
  await preview.getByRole('button', { name: 'Replace my progress' }).click();
  await expect(page.getByTestId('toast').filter({ hasText: 'Progress restored.' })).toBeVisible();
  expect((await storedDoc(page)).xp).toBe(999);
});

const bad: [string, () => string | Buffer, string][] = [
  [
    'a JSON file that is not a backup',
    () => '{"hello":"world"}',
    "That file isn't a Sheet Music 101 backup.",
  ],
  ['a file that is not JSON at all', () => 'not json', "That file isn't a Sheet Music 101 backup."],
  [
    'a damaged backup',
    () =>
      JSON.stringify({
        app: 'sheet-music-101',
        kind: 'backup',
        schemaVersion: 1,
        exportedAt: '2026-10-12T20:15:00.000Z',
        progress: { ...fixtureProgress(), xp: -5 },
      }),
    "That backup file is damaged and can't be used.",
  ],
  ['a 2 MB file', () => Buffer.alloc(2_000_000, 32), 'That file is too big to be a backup.'],
  [
    'a backup from a newer version',
    () =>
      JSON.stringify({
        app: 'sheet-music-101',
        kind: 'backup',
        schemaVersion: 3,
        exportedAt: '2026-10-12T20:15:00.000Z',
        progress: { ...fixtureProgress(), schemaVersion: 3 },
      }),
    'This backup is from a newer version of the app. Update the app first, then try again.',
  ],
];

for (const [label, content, message] of bad) {
  test(`importing ${label} shows the fixed message and changes nothing`, async ({ page }) => {
    await seedProgress(page, fixtureProgress());
    await page.goto('./#/settings');
    const before = await readStored(page);
    await chooseFile(page, 'x.json', content());
    await expect(page.getByTestId('toast')).toHaveText(message);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await readStored(page)).toEqual(before);
  });
}

test('XSS: a backup carrying markup in ids and days is rejected and nothing of it is shown', async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  const img = '<img src=x onerror=alert(1)>';
  const script = '"><script>alert(1)</script>';
  const evil = fixtureProgress() as unknown as Record<string, unknown>;
  evil['lessons'] = {
    [img]: {
      timesCompleted: 1,
      bestAccuracy: 100,
      firstCompletedDay: script,
      lastCompletedDay: img,
    },
  };
  evil['daysPracticed'] = [img, script];
  evil['createdDay'] = script;
  const text = JSON.stringify({
    app: 'sheet-music-101',
    kind: 'backup',
    schemaVersion: 1,
    exportedAt: script,
    progress: evil,
  });
  await seedProgress(page, fixtureProgress());
  await page.goto('./#/settings');
  const before = await readStored(page);
  await chooseFile(page, `${img}.json`, text);
  await expect(page.getByTestId('toast')).toHaveText(
    "That backup file is damaged and can't be used.",
  );
  const html = await page.content();
  expect(html).not.toContain('onerror');
  expect(html).not.toContain('<script>alert');
  expect(html).not.toContain('<img src=x');
  expect(await page.locator('img').count()).toBe(0);
  expect(await readStored(page)).toEqual(before);
  expect(dialogs).toEqual([]);
});

for (const where of ['first', 'second'] as const) {
  test(`Start over: Cancel on the ${where} sheet erases nothing`, async ({ page }) => {
    await seedProgress(page, fixtureProgress());
    await page.goto('./#/settings');
    const before = await readStored(page);
    await page.getByRole('button', { name: 'Start over' }).click();
    if (where === 'second') {
      await page.getByRole('button', { name: 'Continue without backup' }).click();
      await expect(page.getByRole('dialog', { name: 'Erase all progress?' })).toBeVisible();
    }
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await readStored(page)).toEqual(before);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByTestId('xp-value')).toHaveText(String(fixtureProgress().xp));
  });
}

test('Start over: "Save backup" on the first sheet saves a file, then asks again', async ({
  page,
}) => {
  await seedProgress(page, fixtureProgress());
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Start over' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button', { name: 'Save backup' }).click();
  expect((await download).suggestedFilename()).toBe(`sheet-music-101-backup-${DAY}.json`);
  await expect(page.getByRole('dialog', { name: 'Erase all progress?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  expect((await storedDoc(page)).xp).toBe(fixtureProgress().xp);
});
