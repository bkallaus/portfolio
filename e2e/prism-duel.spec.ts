import { test, expect } from '@playwright/test';

const tokens = (page: import('@playwright/test').Page) =>
  page.locator('button[aria-label*="at row"]');

const takeable = (page: import('@playwright/test').Page) =>
  page.locator('button[aria-label*="at row"]:not([disabled])');

test.describe('prism-duel write-up', () => {
  test('introduces the game and links to the playable build', async ({ page }) => {
    await page.goto('/prism-duel/', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'PRISM', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Three ways to win' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Prism Duel board mid-play/ })).toBeVisible();

    await page.getByRole('link', { name: /Play the game/ }).click();
    await expect(page).toHaveURL(/\/prism-duel\/play\//);
    await expect(page.getByRole('heading', { name: 'Prism Duel', level: 1 })).toBeVisible();
  });
});

test.describe('prism-duel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prism-duel/play/', { waitUntil: 'networkidle' });
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

  test('only lets you pick gems that keep the line unbroken', async ({ page }) => {
    await page.getByRole('button', { name: 'Start the duel' }).click();

    const open = await takeable(page).evaluateAll((nodes) =>
      nodes.map((node) => {
        const found = /row (\d) column (\d)/.exec(node.getAttribute('aria-label') ?? '');
        return { row: Number(found?.[1]), col: Number(found?.[2]) };
      }),
    );
    const has = (row: number, col: number) => open.some((s) => s.row === row && s.col === col);

    const line = open
      .map((start) => [0, 1, 2].map((step) => ({ row: start.row, col: start.col + step })))
      .find((cells) => cells.every((c) => c.col <= 5 && has(c.row, c.col)));
    const offLine = open.find(
      (s) => line && (Math.abs(s.row - line[0].row) > 1 || Math.abs(s.col - line[0].col) > 1),
    );
    if (!line || !offLine) {
      throw new Error('the opening board should hold a row of three and a gem out of line with it');
    }

    const at = (row: number, col: number) =>
      page.locator(`button[aria-label*="row ${row} column ${col}"]`);
    const takeButton = page.getByRole('button', { name: /^Take/ });

    await at(line[0].row, line[0].col).click();
    await expect(takeButton).toHaveText(/Take 1 token/);
    await expect(at(offLine.row, offLine.col)).toBeDisabled();
    await expect(page.getByText('keep the line unbroken')).toBeVisible();

    await at(line[1].row, line[1].col).click();
    await at(line[2].row, line[2].col).click();
    await expect(takeButton).toHaveText(/Take 3 tokens/);
    await expect(takeButton).toBeEnabled();

    await at(line[1].row, line[1].col).click();
    await expect(takeButton).toHaveText(/Take 1 token/);

    await takeButton.click();
    await expect(page.getByText('Take up to three tokens in one unbroken line')).toBeVisible();
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
