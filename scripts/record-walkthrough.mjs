#!/usr/bin/env node
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
}

await context.close();
await browser.close();

const video = readdirSync(OUT).find((f) => f.endsWith('.webm'));
if (video) {
  renameSync(path.join(OUT, video), path.join(OUT, 'walkthrough.webm'));
  console.log(`\nvideo: walkthrough/walkthrough.webm`);
}

console.log('\nfindings:');
if (problems.length === 0) console.log('  none — every page rendered');
else {
  problems.forEach((p) => console.log('  ! ' + p));
  process.exitCode = 1;
}
