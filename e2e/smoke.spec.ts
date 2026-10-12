import { test, expect } from './fixtures';

test('app loads, shows the build id and activates the service worker', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Sheet Music 101' })).toBeVisible();
  await expect(page.getByTestId('build-id')).toContainText('Version');
  const active = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active !== null;
  });
  expect(active).toBe(true);
});

test('manifest is valid and icons load', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = (await (await request.get(new URL(href ?? '', page.url()).href)).json()) as {
    name: string;
    icons: { src: string }[];
  };
  expect(manifest.name).toBe('Sheet Music 101');
  for (const icon of manifest.icons) {
    const response = await request.get(new URL(icon.src, page.url()).href);
    expect(response.status(), icon.src).toBe(200);
  }
});
