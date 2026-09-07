import { test, expect } from '@playwright/test';

test.describe('battle-helper', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/battle-helper/');
  });

  test('shows the tactical HUD', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'VGC Tactical HUD' })).toBeVisible();
  });

  test('opens the type chart tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Type Chart' }).click();
    await expect(page.getByRole('heading', { name: 'Full Type Chart' })).toBeVisible();
  });
});
