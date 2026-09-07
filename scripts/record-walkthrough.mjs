#!/usr/bin/env node
// Records one video walking the whole site: every page, opening the nav drawer and
// expanding Experiments on each. Expects the assembled site to be served already:
//
//   npm run build && npx vite preview --outDir dist --port 4173 &
//   node scripts/record-walkthrough.mjs
//
// Writes to walkthrough/ (gitignored).
import { chromium } from '@playwright/test';
import { readFileSync, rmSync, readdirSync, renameSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const OUT = path.join(root, 'walkthrough');

const sites = JSON.parse(readFileSync(path.join(root, 'sites.json'), 'utf8'));
const urlFor = (slug) => (slug === 'portfolio' ? '/' : `/${slug}/`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(OUT, { recursive: true, force: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

const problems = [];
page.on('pageerror', (e) => problems.push(`${page.url()} :: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`${page.url()} :: ${m.text()}`);
});

for (const site of sites) {
  const url = urlFor(site.slug);
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await pause(1400);

  const painted = await page.evaluate(() => document.body.innerHTML.length);
  console.log(`${url.padEnd(18)} ${site.title.padEnd(16)} ${painted} bytes of DOM`);
  if (painted < 400) problems.push(`${url} :: looks blank (${painted} bytes)`);

  await page.mouse.wheel(0, 400);
  await pause(800);
  await page.mouse.wheel(0, -400);
  await pause(400);

  const button = page.locator('.nav-btn').first();
  if (await button.count()) {
    await button.click();
    await pause(1200);
    const toggle = page.locator('.exp-toggle').first();
    if (await toggle.count()) {
      await toggle.click();
      await pause(1400);
      await toggle.click();
      await pause(500);
    }
    await page.keyboard.press('Escape');
    await pause(700);
  } else {
    problems.push(`${url} :: no nav button`);
  }
}

await context.close();
await browser.close();

const video = readdirSync(OUT).find((f) => f.endsWith('.webm'));
if (video) {
  renameSync(path.join(OUT, video), path.join(OUT, 'walkthrough.webm'));
  console.log(`\nvideo: walkthrough/walkthrough.webm`);
}

console.log('\nfindings:');
if (problems.length === 0) console.log('  none — every page rendered and the drawer worked');
else {
  problems.forEach((p) => console.log('  ! ' + p));
  process.exitCode = 1;
}
