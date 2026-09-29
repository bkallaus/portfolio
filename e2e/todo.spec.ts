import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route('**/unpkg.com/**', (route) => route.abort());
});

test('adds a dated todo and downloads it as a calendar file', async ({ page }) => {
  await page.goto('/todo/', { waitUntil: 'networkidle' });

  await page.getByLabel('Todo', { exact: true }).fill('Dentist');
  await page.getByLabel('Date').fill('2026-10-01');
  await page.getByLabel('Time').fill('09:30');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  const item = page.getByRole('listitem').filter({ hasText: 'Dentist' });
  await expect(item).toContainText('30 min');
  await item.getByText('Add to calendar').click();
  await expect(item.getByRole('link', { name: 'Google Calendar' })).toHaveAttribute(
    'href',
    /calendar\.google\.com/,
  );

  const download = page.waitForEvent('download');
  await item.getByRole('button', { name: 'Apple / other (.ics)' }).click();
  expect((await download).suggestedFilename()).toBe('dentist.ics');

  await page.reload();
  await expect(page.getByRole('listitem').filter({ hasText: 'Dentist' })).toBeVisible();
});

test('a share link brings the list to another browser and merges with its copy', async ({
  page,
  browser,
}) => {
  await page.goto('/todo/', { waitUntil: 'networkidle' });
  await page.getByLabel('List name').fill('Weekend');
  await page.getByLabel('Todo', { exact: true }).fill('Mow the lawn');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Share' }).click();
  const link = await page.getByLabel('Share link').inputValue();

  const other = await browser.newContext();
  await other.route('**/unpkg.com/**', (route) => route.abort());
  const friend = await other.newPage();
  await friend.goto(link);
  await expect(friend.getByLabel('List name')).toHaveValue('Weekend');
  await expect(friend.getByText('Mow the lawn')).toBeVisible();
  await expect(friend).toHaveURL(/#list=[a-z0-9]+$/);

  await friend.getByLabel('Todo', { exact: true }).fill('Wash the car');
  await friend.getByRole('button', { name: 'Add', exact: true }).click();
  await friend.getByRole('button', { name: 'Share' }).click();
  const reply = await friend.getByLabel('Share link').inputValue();
  await other.close();

  await page.getByRole('checkbox', { name: 'Mark "Mow the lawn" done' }).check();
  await page.goto(reply);
  await page.reload();
  await expect(page.getByText('Wash the car')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Mark "Mow the lawn" not done' })).toBeChecked();
});
