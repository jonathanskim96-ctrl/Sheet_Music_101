import { test as base, expect } from '@playwright/test';

/** Every test fails if the page logs an error or violates the CSP. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));
      await use(errors);
      expect(errors, 'console errors / CSP violations').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
