import { test, expect } from '@playwright/test';

test.describe('simple-city', () => {
  test('serves the static Pop City page at its own URL', async ({ page }) => {
    await page.goto('/simple-city/');
    await expect(page).toHaveTitle('Pop City');
    await expect(page.locator('#ui')).toBeAttached();
    await expect(page.locator('script[src="main.js"]')).toBeAttached();
  });
});
