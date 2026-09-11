import { expect, test } from '@playwright/test';

test.describe('pit-wall', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pit-wall/');
  });

  test('shows the circuit, the grid and the garage', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Pit Wall' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText('Your car').first()).toBeVisible();
    for (const rival of ['Bolt', 'Hairpin', 'Uppercut']) {
      await expect(page.getByText(rival).first()).toBeVisible();
    }
  });

  test('reads out what the circuit demands', async ({ page }) => {
    await expect(page.locator('.pill')).toHaveText(/Fast|Mixed|Technical/);
    await expect(page.locator('.track-strip')).toContainText('corners');
    await expect(page.locator('.track-strip')).toContainText('flat out');
  });

  test('spends a fixed budget across the car', async ({ page }) => {
    await expect(page.locator('.budget-value')).toHaveText('0');

    const grip = page.getByRole('slider').nth(2);
    await grip.fill('40');
    await expect(page.locator('.budget-value')).toHaveText('20');

    const power = page.getByRole('slider').first();
    await power.fill('100');
    await expect(page.locator('.budget-value')).toHaveText('0');
  });

  test('will not let the car overspend its budget', async ({ page }) => {
    const power = page.getByRole('slider').first();
    await power.fill('100');
    await expect(page.locator('.budget-value')).toHaveText('0');
    await expect(power).toHaveValue('60');
  });

  test('updates the predicted lap time when the car changes', async ({ page }) => {
    const predicted = page.locator('.predicted strong');
    const before = await predicted.innerText();
    await page.getByRole('slider').nth(2).fill('20');
    await expect(predicted).not.toHaveText(before);
  });

  test('races the field and declares a result', async ({ page }) => {
    await page.getByRole('button', { name: '4×' }).click();
    await page.getByRole('button', { name: 'Start race' }).click();
    await expect(page.locator('.verdict')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.verdict')).toContainText(/You win|You finished P/);
    await expect(page.locator('.standings li').first()).toContainText('winner');
  });

  test('generates a different circuit on demand', async ({ page }) => {
    const strip = page.locator('.track-strip');
    const before = await strip.innerText();
    await page.getByRole('button', { name: 'New track' }).click();
    await expect(strip).not.toHaveText(before);
  });
});
