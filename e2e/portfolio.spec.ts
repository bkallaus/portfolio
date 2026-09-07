import { test, expect } from '@playwright/test';

test.describe('portfolio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the hero and the about section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Ben Kallaus', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'About me' })).toBeVisible();
  });

  test('filters skills by category and keeps the page working', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await page.getByRole('button', { name: 'Frontend', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Frontend', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ben Kallaus', level: 1 })).toBeVisible();
  });
});
