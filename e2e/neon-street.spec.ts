import { expect, test } from '@playwright/test';

test.describe('neon-street', () => {
  test('renders the street and flies the camera down it as you scroll', async ({ page }) => {
    await page.goto('/neon-street/');
    await expect(page.getByRole('heading', { name: 'Neon Bloom' })).toBeVisible();
    await expect(page.locator('.ns-root')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });

    const canvas = page.locator('canvas.ns-canvas');
    await expect(canvas).toHaveCount(1);
    const painted = await canvas.evaluate((node: HTMLCanvasElement) => {
      const ctx = node.getContext('2d');
      const { data } = ctx?.getImageData(0, 0, node.width, node.height) ?? { data: [] };
      let lit = 0;
      for (let i = 0; i < data.length; i += 4 * 97) if (data[i] + data[i + 1] + data[i + 2] > 60) lit++;
      return lit;
    });
    expect(painted).toBeGreaterThan(100);

    const telemetry = page.getByLabel('Camera telemetry');
    await expect(telemetry).toContainText('038.0');
    await page.mouse.wheel(0, 4000);
    await expect(telemetry).not.toContainText('038.0');

    await expect(page.getByRole('heading', { name: /Yozakura-dōri/ })).toBeAttached();
  });
});
