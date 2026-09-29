import { test, expect } from '@playwright/test';

test.describe('care-log', () => {
  test('tracks feedings, grooming and medications per person and survives a reload', async ({
    page,
  }) => {
    await page.goto('/care-log/');
    await page.getByLabel("New person's name").fill('Grandpa');
    await page.getByRole('button', { name: 'Add' }).click();

    await page.getByLabel('Food').fill('Soup');
    await page.getByRole('button', { name: 'Log feeding' }).click();

    await page.locator('label', { hasText: /^Grooming$/ }).click();
    await page.getByLabel('Task').fill('Shave');
    await page.getByRole('button', { name: 'Log grooming' }).click();

    await page.locator('label', { hasText: /^Medication$/ }).click();
    await page.getByLabel('Medication name').fill('Aspirin');
    await page.getByLabel('Dose').fill('81mg');
    await page.getByRole('button', { name: 'Log medication' }).click();
    await expect(page.getByRole('radio', { name: 'Medication' })).toBeChecked();

    await page.reload();
    await expect(page.getByRole('listitem', { name: 'Last feeding' })).toContainText('Soup');
    await expect(page.getByRole('listitem', { name: 'Last grooming' })).toContainText('Shave');
    await expect(page.getByRole('listitem', { name: 'Last medication' })).toContainText(
      'Aspirin · 81mg',
    );

    await page.getByLabel('Show').selectOption('medication');
    await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(1);
  });
});
