import { test, expect } from '@playwright/test';

test.describe('quick', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quick/');
  });

  test('groups the tools into categories', async ({ page }) => {
    await expect(page.locator('#section-text-encoding')).toBeVisible();
    await expect(page.locator('#section-generators')).toBeVisible();
  });

  test('encodes text with the Base64 tool', async ({ page }) => {
    await page.getByRole('link', { name: 'Base64 Encoder/Decoder' }).click();
    const section = page.locator('#base64-encoder');
    await expect(section).toBeVisible();
    const fields = section.locator('textarea');
    await fields.first().fill('hello');
    await expect(fields.nth(1)).toHaveValue('aGVsbG8=');
  });
});
