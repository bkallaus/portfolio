import { test, expect } from '@playwright/test';

const tokens = (page: import('@playwright/test').Page) =>
  page.locator('button[aria-label*="at row"]');

const takeable = (page: import('@playwright/test').Page) =>
  page.locator('button[aria-label*="at row"]:not([disabled])');

test.describe('prism-duel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prism-duel/', { waitUntil: 'networkidle' });
  });

  test('shows the lobby and the rules', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Prism Duel', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Versus the engine' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Room code' })).toBeVisible();

    await page.getByRole('button', { name: 'Full rules' }).click();
    await expect(page.getByRole('heading', { name: 'Winning' })).toBeVisible();
    await expect(page.getByText('Gold, the wild token')).toBeVisible();
  });

  test('deals a solo game with a full board and three card rows', async ({ page }) => {
    await page.getByRole('button', { name: 'Start the duel' }).click();

    await expect(page.getByRole('heading', { name: 'The board' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The market' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Royal favours' })).toBeVisible();
    await expect(tokens(page)).toHaveCount(25);
    await expect(page.locator('button[aria-label^="Tier "]')).toHaveCount(12);
    await expect(page.locator('button[aria-label^="Gold at row"]').first()).toBeDisabled();
  });

  test('takes a token and hands the turn to the engine', async ({ page }) => {
    await page.getByRole('button', { name: 'Start the duel' }).click();
    await expect(page.getByText('Your move')).toBeVisible();

    const take = page.getByRole('button', { name: /^Take/ });
    await expect(take).toBeDisabled();

    await takeable(page).first().click();
    await expect(take).toBeEnabled();
    await take.click();

    await expect(tokens(page)).not.toHaveCount(25);
    await page.getByRole('button', { name: 'Log' }).click();
    await expect(page.getByRole('heading', { name: 'Move log' })).toBeVisible();
    await expect(page.getByRole('listitem').first()).toContainText('took');
  });

  test('opens a card and explains why it cannot be bought yet', async ({ page }) => {
    await page.getByRole('button', { name: 'Start the duel' }).click();
    await page.locator('button[aria-label^="Tier 3"]').first().click();

    await expect(page.getByText('YOU PAY')).toBeVisible();
    await expect(page.getByText('not affordable yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buy' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reserve + gold' })).toBeEnabled();
  });

  test('reserves a card for a gold token', async ({ page }) => {
    await page.getByRole('button', { name: 'Start the duel' }).click();
    await page.locator('button[aria-label^="Tier 3"]').first().click();
    await page.getByRole('button', { name: 'Reserve + gold' }).click();

    await expect(page.getByText('RESERVED')).toBeVisible();
  });
});
