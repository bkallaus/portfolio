import { expect, test } from '@playwright/test';

test.describe('neural-race', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/neural-race/');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  });

  test('renders the track and the starting grid', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Neural Race Track' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    for (const name of ['Reflex', 'Weaver', 'Deep Stack', 'Wide Eye']) {
      await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
    }
  });

  test('generates a different track when the seed changes', async ({ page }) => {
    const seed = page.getByRole('spinbutton').first();
    const before = await seed.inputValue();
    await page.getByRole('button', { name: 'New track' }).click();
    await expect(seed).not.toHaveValue(before);
  });

  test('shows the selected car brain and rewires it', async ({ page }) => {
    await page.getByRole('button', { name: /Deep Stack/ }).click();
    await expect(page.getByRole('textbox').first()).toHaveValue('Deep Stack');
    await expect(page.getByText('8 → 10 → 6 → 2')).toBeVisible();

    await page.getByRole('button', { name: 'Drop layer' }).click();
    await expect(page.getByText('8 → 10 → 2')).toBeVisible();

    await page.getByRole('button', { name: 'Drop layer' }).click();
    await expect(page.getByText('No hidden layers')).toBeVisible();
    await expect(page.getByText('8 → 2')).toBeVisible();
  });

  test('resizes the brain when the sensor count changes', async ({ page }) => {
    await page.getByRole('button', { name: /Weaver/ }).click();
    await expect(page.getByText('8 → 6 → 2')).toBeVisible();
    await page.getByRole('slider').first().fill('3');
    await expect(page.getByText('4 → 6 → 2')).toBeVisible();
  });

  test('adds and removes cars from the grid', async ({ page }) => {
    await page.getByRole('button', { name: 'Add car' }).click();
    await expect(page.getByRole('button', { name: /Car 5/ })).toBeVisible();
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('button', { name: /Car 5/ })).toHaveCount(0);
  });

  test('runs the simulation and moves the cars along the track', async ({ page }) => {
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(page.getByText(/run \d+\.\d+s/)).toBeVisible();
  });
});
