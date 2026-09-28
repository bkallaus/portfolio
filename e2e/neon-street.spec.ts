import { expect, test } from '@playwright/test';

test.describe('neon-street', () => {
  test('paints every parallax layer and descends as you scroll', async ({ page }) => {
    await page.goto('/neon-street/');
    await expect(page.getByRole('heading', { name: 'Neon Bloom' })).toBeVisible();
    await expect(page.locator('.ns-root')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    await expect(page.locator('canvas.ns-layer')).toHaveCount(6);

    const altitude = page.getByLabel('Camera telemetry');
    await expect(altitude).toContainText('212.0');

    const street = page.locator('canvas[data-layer="street"]');
    const before = await street.evaluate((node) => getComputedStyle(node).transform);
    await page.mouse.wheel(0, 4000);
    await expect(altitude).not.toContainText('212.0');
    await expect.poll(() => street.evaluate((node) => getComputedStyle(node).transform)).not.toBe(before);

    await expect(page.getByRole('heading', { name: /Yozakura-dōri/ })).toBeAttached();
  });
});
