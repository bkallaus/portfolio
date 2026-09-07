import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Site = { slug: string; type: 'vite' | 'static'; tier?: string; title: string };

const sites: Site[] = JSON.parse(
  readFileSync(path.join(import.meta.dirname, '..', 'sites.json'), 'utf8'),
);

const urlFor = (slug: string) => (slug === 'portfolio' ? '/' : `/${slug}/`);

// musical-cards shipped blank for a while and every headless test still passed,
// because those tests mock the module that broke. Only a real browser catches it.
test.describe('every page renders in a real browser', () => {
  for (const site of sites) {
    test(`${site.slug} renders and logs no errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });

      await page.goto(urlFor(site.slug), { waitUntil: 'networkidle' });

      // A page that throws while mounting leaves an empty root and looks "fine"
      // to any check that only asserts a 200.
      const painted = await page.evaluate(() => document.body.innerHTML.length);
      expect(painted, `${site.slug} painted almost nothing — did a module throw?`).toBeGreaterThan(
        400,
      );
      expect(errors, `${site.slug} logged errors`).toEqual([]);
    });
  }
});

test.describe('the shared nav', () => {
  for (const site of sites) {
    test(`${site.slug} has a working drawer`, async ({ page }) => {
      await page.goto(urlFor(site.slug), { waitUntil: 'networkidle' });

      // The nav renders into an open shadow root; Playwright's CSS engine pierces it.
      const button = page.locator('.nav-btn').first();
      await expect(button).toBeVisible();

      await button.click();
      await expect(page.locator('.drawer[open]')).toBeVisible();

      // Featured pages carry a blurb; experiments are collapsed behind a count.
      const featured = sites.filter((s) => (s.tier ?? 'experiment') === 'featured');
      const experiments = sites.filter((s) => (s.tier ?? 'experiment') === 'experiment');
      await expect(page.locator('.featured-list .site-item')).toHaveCount(featured.length);
      await expect(page.locator('.exp-toggle')).toContainText(`Experiments (${experiments.length})`);

      // The page you are on is marked and is not a link.
      await expect(page.locator('.current-item')).toContainText(site.title);
      await expect(page.locator(`.site-link[href="${urlFor(site.slug)}"]`)).toHaveCount(0);

      // showModal() makes the page behind the drawer inert, so tabbing can never
      // land outside it. The hand-rolled drawer this replaced had no such trap.
      for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
      const trapped = await page.evaluate(() => {
        const nav = document.querySelector('site-nav');
        return nav?.shadowRoot?.contains(nav.shadowRoot.activeElement) ?? false;
      });
      expect(trapped, 'focus escaped the modal drawer').toBe(true);

      await page.keyboard.press('Escape');
      await expect(page.locator('.drawer[open]')).toBeHidden();

      // Closing by any route hands focus back to the trigger.
      await expect(button).toBeFocused();
    });
  }
});

test('the nav stays out of the iframed hero on the hub', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const frame = page.frameLocator('iframe').first();
  const navInsideFrame = frame.locator('.nav-btn');
  // simple-city is iframed into the portfolio's hero; nav.ts guards on window.top
  // so a button must never appear inside it.
  await expect(navInsideFrame).toHaveCount(0);
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
