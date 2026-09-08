import { test, expect } from '@playwright/test';

test.describe('neural-race-track', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/neural-race-track/');
  });

  test('renders the simulation and its canvas', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Neural Race Track' })).toBeVisible();
    await expect(page.locator('canvas.nrt-canvas')).toBeVisible();
  });

  test('pauses and resumes the race', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'Pause' });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });

  test('adds a car to the garage', async ({ page }) => {
    const cards = page.locator('.nrt-car');
    const before = await cards.count();
    await page.getByRole('button', { name: '+ Add car' }).click();
    await expect(cards).toHaveCount(before + 1);
  });
});
