import { test, expect } from '@playwright/test';

test.describe('poke-search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/poke-search/');
  });

  test('builds a search string from a toggle and clears it', async ({ page }) => {
    const box = page.getByPlaceholder('Build your Pokémon GO search string...');
    await expect(box).toHaveValue('');

    await page.getByRole('button', { name: 'Legendary' }).click();
    await expect(box).toHaveValue('legendary');

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(box).toHaveValue('');
  });
});
