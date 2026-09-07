import { test, expect } from '@playwright/test';

const notes = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

test.describe('musical-cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/musical-cards/');
  });

  test('renders the sight-reading prompt', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Musical Cards' })).toBeVisible();
    await expect(page.getByText('What note is this?')).toBeVisible();
  });

  test('offers a button for every natural note and responds to a guess', async ({ page }) => {
    for (const note of notes) {
      await expect(page.getByRole('button', { name: note, exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'c', exact: true }).click();
    await expect(page.getByText('What note is this?')).toBeVisible();
  });
});
