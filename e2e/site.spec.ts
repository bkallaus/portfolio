import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Site = { slug: string; type: 'vite' | 'static'; tier?: string; title: string };

const sites: Site[] = JSON.parse(
  readFileSync(path.join(import.meta.dirname, '..', 'sites.json'), 'utf8'),
);

const urlFor = (slug: string) => (slug === 'portfolio' ? '/' : `/${slug}/`);

test.describe('every page renders in a real browser', () => {
  for (const site of sites) {
    test(`${site.slug} renders and logs no errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });

      await page.goto(urlFor(site.slug), { waitUntil: 'networkidle' });

      const painted = await page.evaluate(() => document.body.innerHTML.length);
      expect(painted, `${site.slug} painted almost nothing — did a module throw?`).toBeGreaterThan(
        400,
      );
      expect(errors, `${site.slug} logged errors`).toEqual([]);
    });
  }
});

test('portfolio projects section shows view more button and reveals experimental projects', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const viewMoreBtn = page.getByRole('button', { name: 'View More' });
  await expect(viewMoreBtn).toBeVisible();

  await expect(page.getByText('Experimental Projects')).toBeHidden();

  await viewMoreBtn.click();

  await expect(page.getByText('Experimental Projects')).toBeVisible();
  await expect(page.getByText('Poke Search')).toBeVisible();
  await expect(page.getByText('Battle Helper')).toBeVisible();
  await expect(page.getByText('Simple City')).toBeVisible();

  const viewLessBtn = page.getByRole('button', { name: 'View Less' });
  await expect(viewLessBtn).toBeVisible();

  await viewLessBtn.click();
  await expect(page.getByText('Experimental Projects')).toBeHidden();
});

test('each page gets its own assets and its public/ files', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  for (const site of sites) {
    await page.goto(urlFor(site.slug), { waitUntil: 'networkidle' });
  }
  expect(failed, 'some assets 404ed').toEqual([]);
});
