# ben.kallaus.me

Every page on `ben.kallaus.me` lives here and ships as a single GitHub Pages artifact.

## Agent skills

Reusable instructions live in `.agents/skills/`, one directory per skill, each with a
`SKILL.md`. Read the one that matches before starting that kind of work. Claude Code finds
them through the `.claude/skills` symlink; every other agent reads this table.

| Skill | Use it when |
| --- | --- |
| `demo` | A PR needs a GIF of the change working. Records with Playwright, posts it as a PR comment, never commits the file. |
| `app-structure` | Building a new side app, adding a site, or organizing an application folder structure in this repository. |
| `no-comments` | Writing or reviewing code to enforce the rule that no comments are allowed in the codebase. |
| `tdd` | Building a feature or fixing a bug test-first. |
| `codebase-design` | Designing a module's interface, or another skill asks for the deep-module vocabulary. |
| `improve-codebase-architecture` | Hunting for refactors that turn shallow modules into deep ones. |
| `design-taste-frontend` | Building or redesigning a landing page or portfolio UI that should not look templated. |

`.agents/skills/README.md` covers where each came from and how to add one.

## Three invariants

Break any of these and the site breaks in a way local dev will not show you.

**1. A page's directory name is its URL segment.** `apps/quick` serves `/quick/`;
`apps/duel/play` serves `/duel/play/`; `public/duel` serves `/duel/`.
`vite.config.ts` builds every `index.html` it finds under `apps/<slug>/` (skipping `src/` and
`test/`), and the `html-at-url-segment` plugin renames each emitted page from its source path
to its URL, so the folder and the URL cannot drift apart. The dev server applies the same
mapping, so you develop against the URL you ship. `apps/portfolio` is the one exception — it
is the hub and serves `/`.

**2. There is exactly one `package.json`, at the root.** No workspaces, no per-app manifest,
no per-app lockfile. Every app therefore builds against one version of everything (React 19,
Vite 8, TypeScript 5.9). A new dependency goes in the root manifest; an upgrade for one app
is an upgrade for all of them, which is what `ci.yml` exists to catch.

**3. `tier` defaults to `experiment`.** You opt *in* to the showcase, never out of it. A
half-built scratch project cannot leak into the public persona by forgetting a flag.

## TypeScript, not JavaScript

New source is `.ts` / `.tsx`. This is not a style preference — the toolchain covers TypeScript
and nothing else. `biome.json` scopes linting to `**/*.{ts,tsx}`, and `tsconfig.json` sets
`checkJs: false`. A `.js` or `.jsx` file is therefore invisible to both `npm run lint` and
`npm run typecheck`: it fails in a browser instead of in CI, which is the failure mode this repo
is otherwise built to avoid. `allowJs` is on for the legacy files below, not as an invitation.

The exceptions are pre-existing and closed. Do not read them as precedent for a new app:

- `apps/musical-cards/src` is pre-consolidation `.jsx` throughout. Leave it, or convert it as
  its own change — do not copy it as the pattern for anything new.
- Files a tool loads directly stay JS: `apps/*/tailwind.config.js` and
  `scripts/record-walkthrough.mjs`. Linting is configured in `biome.json`, which is JSON.

## Adding a site

Two places, and only two: the source directory and one row in `sites.json`.

1. Pick the slug you want in the URL. That decision is now made — it is the directory name.
2. Add the source, in TypeScript.
   - **A Vite app** is `apps/<slug>/index.html` plus `src/`. No per-app `vite.config.ts`,
     `package.json`, test config or setup file — the root config finds the page by walking
     `apps/`. Need a second page (a game behind a write-up, say)? Put another `index.html` in
     a subdirectory: `apps/<slug>/play/index.html` serves `/<slug>/play/`. Never set `base` or
     `outDir` anywhere; the root config owns every output path.
   - **A static page** is `public/<slug>/index.html` and its assets, copied verbatim and
     never parsed.
3. Static assets go in the one root `publicDir`, under the slug: `public/<slug>/manifest.json`
   serves at `/<slug>/manifest.json`. There is no per-app `public/`. The hub is the exception
   again — `public/favicon.ico` serves at `/favicon.ico`, because portfolio is `/`.
4. Add a row to `sites.json`: `slug`, `title`, and ideally `blurb` and `tech`. Omit `tier`
   unless you are promoting it to `featured` or hiding it (`"hidden"`). The row is what puts
   the page on the hub and into the e2e sweep.
5. Add any new dependencies to the root `package.json` and `npm install --legacy-peer-deps`
   at the root.
6. `npm test`, then `npm run test:e2e`.

`npm test` fails if a `sites.json` row points at no page, or a page has no row, so steps 2
and 4 cannot drift. `npm run test:e2e` proves the page renders and every asset resolves — a
green `npm run build` alone does not.

### What gets picked up automatically

| You add | Picked up by | Because |
| --- | --- | --- |
| `apps/<slug>/**/index.html` | the build and the dev server | `vite.config.ts` walks `apps/` |
| `apps/<slug>/src/**/*.test.{ts,tsx}` | `npm test` | the `apps` project in `vitest.config.ts` globs for it |
| `apps/<slug>/test/run.ts` | `npm test` | `scripts/test-engines.ts` runs every one it finds with plain Node |
| `apps/<slug>/src`, `apps/<slug>/test` | `npm run typecheck` | `tsconfig.json` includes both globs |
| a `sites.json` row | the hub's project grid, the e2e sweep | both read it through `sites.ts` |

Unit tests share one setup file, the root `vitest.setup.ts` (jest-dom matchers and a canvas
mock). Add to it rather than creating a per-app one.

## How the build assembles

`npm run build` is `vite build`. One pass, one hashed asset graph, every page. There is no
build script, no per-app build, and nothing to run before or after it.

Three pieces of `vite.config.ts` do the work, and none of it is Vite's default behaviour:

1. **Page discovery** walks `apps/` and makes one Rollup input per `index.html`.
2. **`html-at-url-segment`** renames emitted HTML in `generateBundle`. Vite writes each page
   to its path relative to root — `dist/apps/<slug>/` — which is one directory deeper than the
   URL. The plugin rewrites `fileName` to `<slug>/index.html`, and portfolio's to `index.html`.
3. **`urls-match-production`** is the dev-server mirror of that rename: `/<slug>/…` is served
   from `apps/<slug>/…` when that file exists, and otherwise falls through to `public/`, with
   a directory URL resolving to its `index.html` the way GitHub Pages does.

The root `public/` is copied verbatim to the artifact root, which is all a static page is.

One page failing fails the build: every site deploys together or not at all.

## Routing

There is none. No router, no redirects, no config. URLs resolve by static file lookup against
the assembled `dist/`, which is why invariant 1 matters.

`sites.json` is **not** load-bearing for serving. It drives the hub's project grid and the e2e
sweep only. Read it through `sites.ts` (`sites`, `urlFor`, `listedIn`), never by parsing the
JSON yourself — that is what keeps the hub, the tests and the walkthrough script agreeing on
what a URL is.

Consequence worth knowing before you reach for client-side routing: one Pages site gets one
root `404.html`. Deep links like `/quick/base64` need the `404.html`-restores-the-path trick,
and after consolidation that fallback is global and must dispatch on the path prefix.

## The hub

`apps/portfolio` lists projects from two sources. Pages in this repo come from `sites.json`:
`featured` rows sit in the main grid, `experiment` rows behind "View More", `hidden` rows
nowhere. Projects that live elsewhere (another domain, another repo) are the `projects` array
in `public/res_primaryLanguage.json`. Do not list a page from this repo there; give it a
`sites.json` row instead.

## Landmines

- **Never commit a `CNAME` outside `public/`.** Only root `public/CNAME` may exist. An apex
  `CNAME` in a subdirectory competes with the user site for the domain. `apps/musical-cards`
  shipped one before consolidation; it was deleted for this reason. `public/<slug>/` is a
  published directory now, so the same rule applies there.
- **A slug lives in `apps/` or `public/`, not both, for the same page.** `apps/duel/play/` and
  `public/duel/index.html` coexist because they are different URLs. An `apps/<slug>/index.html`
  next to a `public/<slug>/index.html` would race for `/<slug>/`; `npm test` rejects it.
- `apps/portfolio` builds to `dist/`, not `build/` — uniform with every other app.
- The root is `"type": "module"`, so `__dirname` is unavailable in config files. Use
  `import.meta.dirname`.

## Installing

`npm install --legacy-peer-deps`. The flag is not optional on npm 10: resolving vitest 4's
peer set crashes arborist with `Cannot read properties of null (reading 'edgesOut')`. It is an
npm bug, not a real dependency conflict — the tree it produces is correct, and `npm ci` from
the committed lockfile is unaffected, which is what CI runs.

## Deploying

Push to `master`, or run the workflow manually (`workflow_dispatch`). `deploy.yml` builds and
publishes the artifact. Both workflows run the shared `checks.yml` first — lint, build,
typecheck, unit tests, and the Playwright e2e suite — so `ci.yml` guards every PR and
`deploy.yml` gates on the same checks before publishing. Nothing reaches production without
passing the suite that guards PRs.

The workflow owns the Pages configuration too: `configure-pages` runs with `enablement: true`,
which switches the repo's Pages source from "Deploy from a branch" to "GitHub Actions" on the
first run. Nothing deploys from a `gh-pages` branch anymore, and no one has to set that in
Settings by hand. If the run logs a permissions error on that step, flip it once at
Settings → Pages → Source → GitHub Actions and it will stay put.
