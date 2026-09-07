#!/usr/bin/env node
/**
 * build-all.mjs
 *
 * Assembles the single GitHub Pages artifact for ben.kallaus.me out of six
 * independent app sources. Run from anywhere; paths are resolved relative
 * to the repo root (this file's parent directory's parent).
 *
 *   node scripts/build-all.mjs
 *
 * Steps (in order):
 *   1. Read sites.json from the repo root.
 *   2. Wipe and recreate a clean dist/ at the repo root.
 *   3. For each site with type "vite": run `vite build apps/<slug>` as a
 *      subprocess. A failed app build fails the whole script (non-zero
 *      exit) - we never want to silently ship five sites and drop one.
 *      Copy apps/<slug>/dist/ into the assembled output (dist/ root for
 *      "portfolio", dist/<slug>/ for everyone else).
 *   4. For each site with type "static": copy apps/<slug>/ verbatim into
 *      dist/<slug>/, excluding .git, .github, node_modules, package.json,
 *      and package-lock.json.
 *   5. Build the nav bundle (`node packages/nav/build.mjs`) and copy
 *      packages/nav/dist/ into dist/_nav/.
 *   6. Copy the repo-root public/ directory (if present) into dist/ root -
 *      this is how public/CNAME reaches the artifact root.
 *   7. Inject `<script type="module" src="/_nav/nav.js" defer></script>`
 *      immediately before </body> in every .html file under dist/,
 *      recursively. Idempotent (skips files that already have the tag) and
 *      opt-outable per site via `"nav": false` in sites.json. Warns and
 *      appends at EOF if a file has no </body>.
 *   8. Print a summary: each slug, its output path, and how many html
 *      files got the nav tag injected.
 *
 * Only node builtins are used - no external dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const NAV_DIR = path.join(ROOT_DIR, 'packages', 'nav');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SITES_JSON_PATH = path.join(ROOT_DIR, 'sites.json');

const NAV_TAG = '<script type="module" src="/_nav/nav.js" defer></script>';

const STATIC_COPY_EXCLUDES = new Set([
  '.git',
  '.github',
  'node_modules',
  'package.json',
  'package-lock.json',
]);

/** Print an error and exit non-zero. One broken app fails the whole deploy. */
function fail(message) {
  console.error(`\n[build-all] FAILED: ${message}\n`);
  process.exit(1);
}

function log(message) {
  console.log(`[build-all] ${message}`);
}

// ---------------------------------------------------------------------------
// Step 1: read sites.json
// ---------------------------------------------------------------------------
function readSites() {
  if (!fs.existsSync(SITES_JSON_PATH)) {
    fail(`sites.json not found at ${SITES_JSON_PATH}`);
  }
  let raw;
  try {
    raw = fs.readFileSync(SITES_JSON_PATH, 'utf8');
  } catch (err) {
    fail(`could not read sites.json: ${err.message}`);
  }
  let sites;
  try {
    sites = JSON.parse(raw);
  } catch (err) {
    fail(`sites.json is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(sites)) {
    fail('sites.json must be a JSON array of site entries');
  }
  for (const site of sites) {
    if (!site || typeof site.slug !== 'string' || !site.slug) {
      fail(`every entry in sites.json needs a non-empty "slug": ${JSON.stringify(site)}`);
    }
    if (site.type !== 'vite' && site.type !== 'static') {
      fail(`site "${site.slug}" has invalid type "${site.type}" (expected "vite" or "static")`);
    }
  }
  return sites;
}

// ---------------------------------------------------------------------------
// Step 2: wipe and recreate dist/
// ---------------------------------------------------------------------------
function resetDistDir() {
  log(`Cleaning ${path.relative(ROOT_DIR, DIST_DIR)}/ ...`);
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

/** Resolve where a site's built output lands inside the assembled dist/. */
function outputDirFor(site) {
  return site.slug === 'portfolio' ? DIST_DIR : path.join(DIST_DIR, site.slug);
}

// ---------------------------------------------------------------------------
// Step 3: build + copy each vite site
// ---------------------------------------------------------------------------
function localBin(name) {
  const winName = process.platform === 'win32' ? `${name}.cmd` : name;
  return path.join(ROOT_DIR, 'node_modules', '.bin', winName);
}

function buildViteSite(site) {
  const appDir = path.join(APPS_DIR, site.slug);
  if (!fs.existsSync(appDir)) {
    fail(`apps/${site.slug} does not exist (declared as type "vite" in sites.json)`);
  }

  log(`Building vite app: ${site.slug} ...`);
  const viteBin = localBin('vite');
  const result = spawnSync(viteBin, ['build', `apps/${site.slug}`], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  if (result.error) {
    fail(`could not run vite for "${site.slug}": ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`vite build failed for "${site.slug}" (exit code ${result.status})`);
  }

  const builtDir = path.join(appDir, 'dist');
  if (!fs.existsSync(builtDir)) {
    fail(
      `vite build for "${site.slug}" succeeded but apps/${site.slug}/dist was not created ` +
        `(is build.outDir set correctly in vite.shared.ts / this app's vite.config.ts?)`,
    );
  }

  const destDir = outputDirFor(site);
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(builtDir, destDir, { recursive: true });
  log(`  -> copied apps/${site.slug}/dist/ to ${path.relative(ROOT_DIR, destDir)}/`);
}

// ---------------------------------------------------------------------------
// Step 4: copy each static site verbatim (minus excluded paths)
// ---------------------------------------------------------------------------
function copyStaticSite(site) {
  const appDir = path.join(APPS_DIR, site.slug);
  if (!fs.existsSync(appDir)) {
    fail(`apps/${site.slug} does not exist (declared as type "static" in sites.json)`);
  }

  const destDir = outputDirFor(site);
  log(`Copying static app: ${site.slug} ...`);
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(appDir, destDir, {
    recursive: true,
    filter: (src) => !STATIC_COPY_EXCLUDES.has(path.basename(src)),
  });
  log(`  -> copied apps/${site.slug}/ to ${path.relative(ROOT_DIR, destDir)}/`);
}

// ---------------------------------------------------------------------------
// Step 5: build + copy the nav bundle
// ---------------------------------------------------------------------------
function buildNav() {
  const buildScript = path.join(NAV_DIR, 'build.mjs');
  if (!fs.existsSync(buildScript)) {
    fail(`packages/nav/build.mjs does not exist`);
  }

  log('Building shared nav bundle ...');
  const result = spawnSync('node', ['packages/nav/build.mjs'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  if (result.error) {
    fail(`could not run packages/nav/build.mjs: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`nav build failed (exit code ${result.status})`);
  }

  const navDistDir = path.join(NAV_DIR, 'dist');
  if (!fs.existsSync(navDistDir)) {
    fail('nav build succeeded but packages/nav/dist was not created');
  }

  const destDir = path.join(DIST_DIR, '_nav');
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(navDistDir, destDir, { recursive: true });
  log(`  -> copied packages/nav/dist/ to ${path.relative(ROOT_DIR, destDir)}/`);
}

// ---------------------------------------------------------------------------
// Step 6: copy repo-root public/ into dist/ root (e.g. CNAME)
// ---------------------------------------------------------------------------
function copyRootPublic() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    log('No repo-root public/ directory found, skipping.');
    return;
  }
  log('Copying repo-root public/ into dist/ ...');
  fs.cpSync(PUBLIC_DIR, DIST_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Step 7: inject the nav tag into every html file under dist/
// ---------------------------------------------------------------------------
function findHtmlFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Which sites.json entry (if any) owns a given dist-relative path. */
function siteForRelPath(relPath, sitesBySlug) {
  const parts = relPath.split(path.sep);
  if (parts.length === 1) {
    // File sits directly at dist/ root -> belongs to portfolio (the hub).
    return sitesBySlug.get('portfolio') ?? null;
  }
  const top = parts[0];
  if (top === '_nav') {
    return 'skip'; // the nav bundle itself is never a "site"
  }
  return sitesBySlug.get(top) ?? null;
}

/**
 * Insert NAV_TAG before </body>. Returns true if the file was modified.
 * Idempotent: does nothing if the tag is already present. If there's no
 * </body>, appends the tag at EOF and warns.
 */
function injectNavTag(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');

  if (original.includes(NAV_TAG)) {
    return false; // already injected
  }

  const closeBodyIndex = original.lastIndexOf('</body>');
  let updated;
  if (closeBodyIndex === -1) {
    console.warn(
      `[build-all] WARNING: ${path.relative(DIST_DIR, filePath)} has no </body> tag; ` +
        'appending nav script at end of file.',
    );
    updated = `${original}\n${NAV_TAG}\n`;
  } else {
    updated = `${original.slice(0, closeBodyIndex)}${NAV_TAG}\n${original.slice(closeBodyIndex)}`;
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  return true;
}

function injectNavEverywhere(sites) {
  const sitesBySlug = new Map(sites.map((site) => [site.slug, site]));
  const htmlFiles = findHtmlFiles(DIST_DIR);

  /** @type {Map<string, number>} slug -> count of files actually injected */
  const injectedCounts = new Map();

  for (const filePath of htmlFiles) {
    const relPath = path.relative(DIST_DIR, filePath);
    const site = siteForRelPath(relPath, sitesBySlug);

    if (site === 'skip') {
      continue;
    }
    if (site && site.nav === false) {
      continue;
    }

    const slugKey = site ? site.slug : '(unmapped)';
    const wasInjected = injectNavTag(filePath);
    if (wasInjected) {
      injectedCounts.set(slugKey, (injectedCounts.get(slugKey) ?? 0) + 1);
    }
  }

  return injectedCounts;
}

// ---------------------------------------------------------------------------
// Step 8: summary
// ---------------------------------------------------------------------------
function printSummary(sites, injectedCounts) {
  console.log('\n[build-all] Build summary:');
  for (const site of sites) {
    const outDir = outputDirFor(site);
    const relOut = path.relative(ROOT_DIR, outDir) + '/';
    const navCount = injectedCounts.get(site.slug) ?? 0;
    console.log(
      `  ${site.slug.padEnd(16)} type=${site.type.padEnd(7)} -> ${relOut.padEnd(28)} ` +
        `(${navCount} html file${navCount === 1 ? '' : 's'} nav-injected)`,
    );
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
  const sites = readSites();

  resetDistDir();

  for (const site of sites) {
    if (site.type === 'vite') {
      buildViteSite(site);
    }
  }

  for (const site of sites) {
    if (site.type === 'static') {
      copyStaticSite(site);
    }
  }

  buildNav();
  copyRootPublic();

  const injectedCounts = injectNavEverywhere(sites);

  printSummary(sites, injectedCounts);
  log('Done.');
}

main();
