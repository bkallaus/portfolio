import { test, expect } from '@playwright/test';

test.describe('vanishing-tic-tac-toe', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vanishing-tic-tac-toe/');
  });

  test('renders the board and prompts the first player', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Vanishing Tic-Tac-Toe' })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Player X to move');
  });

  test('removes a player oldest mark once they place a fourth', async ({ page }) => {
    const cells = page.getByRole('button', { name: /^Cell/ });

    await cells.nth(0).click();
    await cells.nth(1).click();
    await cells.nth(2).click();
    await cells.nth(3).click();
    await cells.nth(4).click();
    await cells.nth(7).click();
    await cells.nth(5).click();

    await expect(page.getByRole('button', { name: 'Cell 1, empty' })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Player O to move');
  });

  test('resets to a fresh game', async ({ page }) => {
    const cells = page.getByRole('button', { name: /^Cell/ });
    await cells.nth(0).click();
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.getByRole('status')).toHaveText('Player X to move');
  });
});
