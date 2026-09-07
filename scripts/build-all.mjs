#!/usr/bin/env node
// Assembles every page of ben.kallaus.me into ./dist as one GitHub Pages artifact.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const NAV_TAG = '<script type="module" src="/_nav/nav.js" defer></script>';

const die = (msg) => {
  console.error(`[build-all] ${msg}`);
  process.exit(1);
};

const run = (cmd, args, label) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: false });
  if (r.status !== 0) die(`${label} failed (exit ${r.status}). One broken page fails the whole site on purpose.`);
};

const sitesPath = path.join(root, 'sites.json');
if (!fs.existsSync(sitesPath)) die('sites.json not found at repo root.');
const sites = JSON.parse(fs.readFileSync(sitesPath, 'utf8'));
for (const s of sites) {
  if (!s.slug || !s.type) die(`sites.json entry missing slug or type: ${JSON.stringify(s)}`);
  if (!fs.existsSync(path.join(root, 'apps', s.slug))) die(`sites.json lists "${s.slug}" but apps/${s.slug} does not exist.`);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

console.log('[build-all] Building all pages in one pass ...');
run(path.join(root, 'node_modules', '.bin', 'vite'), ['build'], 'vite build');

// Vite emits each page at its source path; move it to the URL the folder declares.
const emitted = path.join(dist, 'apps');
for (const site of sites.filter((s) => s.type === 'vite')) {
  const from = path.join(emitted, site.slug);
  if (!fs.existsSync(from)) die(`expected build output at dist/apps/${site.slug}, found none.`);
  const to = site.slug === 'portfolio' ? dist : path.join(dist, site.slug);
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from)) {
    fs.cpSync(path.join(from, entry), path.join(to, entry), { recursive: true });
  }
  console.log(`[build-all]   ${site.slug} -> ${site.slug === 'portfolio' ? 'dist/' : `dist/${site.slug}/`}`);
}
fs.rmSync(emitted, { recursive: true, force: true });

// A single build has one publicDir (the repo root's), so each page's own public/
// files are copied here instead.
for (const site of sites.filter((s) => s.type === 'vite')) {
  const pub = path.join(root, 'apps', site.slug, 'public');
  if (!fs.existsSync(pub)) continue;
  const to = site.slug === 'portfolio' ? dist : path.join(dist, site.slug);
  fs.cpSync(pub, to, { recursive: true });
  console.log(`[build-all]   ${site.slug} public/ -> ${site.slug === 'portfolio' ? 'dist/' : `dist/${site.slug}/`}`);
}

// A page with no build step is copied verbatim, so it needs to be told what is
// source and what is workshop litter. Anything matched here is never published:
// dotfiles and dot-directories, docs, scripts, and logs. A page can name more in
// its sites.json entry via `exclude`, which takes plain names or * globs.
const SKIP = new Set(['.git', '.github', 'node_modules', 'package.json', 'package-lock.json']);
const DENY = [/^\./, /\.md$/i, /\.py$/i, /\.log$/i];
const globToRe = (g) => new RegExp('^' + g.split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');

for (const site of sites.filter((s) => s.type === 'static')) {
  const extra = (site.exclude ?? []).map(globToRe);
  const from = path.join(root, 'apps', site.slug);
  let skipped = 0;
  fs.cpSync(from, path.join(dist, site.slug), {
    recursive: true,
    filter: (src) => {
      if (src === from) return true;
      const name = path.basename(src);
      const publish = !SKIP.has(name) && !DENY.some((re) => re.test(name)) && !extra.some((re) => re.test(name));
      if (!publish) skipped += 1;
      return publish;
    },
  });
  console.log(`[build-all]   ${site.slug} -> dist/${site.slug}/ (copied, not built; ${skipped} paths withheld)`);
}

console.log('[build-all] Building shared nav ...');
run(process.execPath, [path.join(root, 'packages', 'nav', 'build.mjs')], 'nav build');
fs.cpSync(path.join(root, 'packages', 'nav', 'dist'), path.join(dist, '_nav'), { recursive: true });

// The repo-root public/ carries CNAME, which must land at the artifact root.
const rootPublic = path.join(root, 'public');
if (fs.existsSync(rootPublic)) fs.cpSync(rootPublic, dist, { recursive: true });

const noNav = new Set(sites.filter((s) => s.nav === false).map((s) => s.slug));
const injected = {};
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (p === path.join(dist, '_nav')) continue;
      walk(p);
    } else if (entry.name.endsWith('.html')) {
      const rel = path.relative(dist, p);
      const slug = rel.includes(path.sep) ? rel.split(path.sep)[0] : 'portfolio';
      if (noNav.has(slug)) continue;
      let html = fs.readFileSync(p, 'utf8');
      if (html.includes(NAV_TAG)) continue;
      if (html.includes('</body>')) html = html.replace('</body>', `  ${NAV_TAG}\n</body>`);
      else { console.warn(`[build-all] no </body> in ${rel}; appending`); html += `\n${NAV_TAG}\n`; }
      fs.writeFileSync(p, html);
      injected[slug] = (injected[slug] ?? 0) + 1;
    }
  }
};
walk(dist);

console.log('\n[build-all] Summary:');
for (const site of sites) {
  const url = site.slug === 'portfolio' ? '/' : `/${site.slug}/`;
  console.log(
    `  ${site.slug.padEnd(15)} ${String(site.type).padEnd(7)} -> ${url.padEnd(16)} (${injected[site.slug] ?? 0} html nav-injected)`,
  );
}
console.log('[build-all] Done.');
