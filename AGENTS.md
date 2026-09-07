# ben.kallaus.me

Every page on `ben.kallaus.me` lives here and ships as a single GitHub Pages artifact.

## Agent skills

Reusable instructions live in `.agents/skills/`, one directory per skill, each with a
`SKILL.md`. Read the one that matches before starting that kind of work. Claude Code finds
them through the `.claude/skills` symlink; every other agent reads this table.

| Skill | Use it when |
| --- | --- |
| `demo` | A PR needs a GIF of the change working. Records with Playwright, posts it as a PR comment, never commits the file. |
| `no-comments` | Writing or reviewing code to enforce the rule that no comments are allowed in the codebase. |
| `tdd` | Building a feature or fixing a bug test-first. |
| `codebase-design` | Designing a module's interface, or another skill asks for the deep-module vocabulary. |
| `improve-codebase-architecture` | Hunting for refactors that turn shallow modules into deep ones. |
| `design-taste-frontend` | Building or redesigning a landing page or portfolio UI that should not look templated. |

`.agents/skills/README.md` covers where each came from and how to add one.

## Three invariants

Break any of these and the site breaks in a way local dev will not show you.

**1. A page's directory name is its URL segment.** `apps/quick` serves `/quick/`;
`public/simple-city` serves `/simple-city/`. `vite.config.ts` derives one Rollup entry per
`"vite"` row in `sites.json`, and the `html-at-url-segment` plugin renames each emitted page
from its source path to its slug, so the folder, the manifest row, and the URL cannot drift
apart. The dev server rewrites `/<slug>/` to `apps/<slug>/` for the same reason: you develop
against the URL you ship. `apps/portfolio` is the one exception — it is the hub and serves `/`.

**2. There is exactly one `package.json`, at the root.** No workspaces, no per-app manifest,
no per-app lockfile. Every app therefore builds against one version of everything (React 19,
Vite 8, TypeScript 5.9). A new dependency goes in the root manifest; an upgrade for one app
is an upgrade for all six, which is what `ci.yml` exists to catch.

**3. `tier` defaults to `experiment`.** You opt *in* to the showcase, never out of it. A
half-built scratch project cannot leak into the public persona by forgetting a flag.

## TypeScript, not JavaScript

New source is `.ts` / `.tsx`. This is not a style preference — the toolchain covers TypeScript
and nothing else. `eslint.config.js` matches `**/*.{ts,tsx}`, and `tsconfig.json` sets
`checkJs: false`. A `.js` or `.jsx` file is therefore invisible to both `npm run lint` and
`npm run typecheck`: it fails in a browser instead of in CI, which is the failure mode this repo
is otherwise built to avoid. `allowJs` is on for the legacy files below, not as an invitation.

The exceptions are pre-existing and closed. Do not read them as precedent for a new app:

- `apps/musical-cards/src` is pre-consolidation `.jsx` throughout. Leave it, or convert it as
  its own change — do not copy it as the pattern for anything new.
- `public/simple-city/main.js` is a no-build static page; the browser loads that file
  verbatim, so it is the one place where the source *is* the artifact.
- `packages/nav/src/nav.js` is a Vite entry now, so it *could* be `.ts` for free. That is the
  one conversion worth doing the next time someone opens the nav.
- Files a tool loads directly stay JS: `eslint.config.js`, `apps/*/tailwind.config.js`, and
  `scripts/record-walkthrough.mjs`.

## Adding a site

1. Pick the slug you want in the URL. That decision is now made — it is the directory name.
2. Add the source, in TypeScript. A Vite app is `apps/<slug>/index.html` plus `src/`, and
   **no per-app `vite.config.ts`** — the root config reads `sites.json` and derives one Rollup
   entry per app, so step 4 is what wires the page into the build. A static page is a
   directory under `public/` instead: `public/<slug>/index.html` and its assets, copied
   verbatim and never parsed. Never set `base` or `outDir` anywhere; the root config owns
   every output path, and hardcoding one is the drift this design removes.
3. Static assets go in the one root `publicDir`, under the slug: `public/<slug>/manifest.json`
   serves at `/<slug>/manifest.json`. There is no per-app `public/`. The hub is the exception
   again — `public/favicon.ico` serves at `/favicon.ico`, because portfolio is `/`.
4. Add a row to `sites.json`. `type` is `"vite"` or `"static"`. Omit `tier` unless you are
   deliberately promoting it to `featured` (needs a `blurb`) or hiding it (`"hidden"`).
5. Add any new dependencies to the root `package.json` and `npm install --legacy-peer-deps`
   at the root.
6. If the page is static, paste the nav tag into its `</body>` yourself — see the landmine.
7. `npm run build`, then confirm three things in `dist/`: `dist/<slug>/index.html` exists, its
   asset URLs start with `/<slug>/`, and the nav `<script>` tag is there.

Done when step 7's three checks pass, and `npm run test:e2e` is what proves it — a green
`npm run build` alone does not. A wrong path builds cleanly and 404s every asset in production.

## How the build assembles

`npm run build` is `vite build`. One pass, one hashed asset graph, every page. There is no
build script, no per-app build, and nothing to run before or after it.

Five jobs that a wrapper script used to own now live in `vite.config.ts`, and it is worth
knowing which piece does which, because none of it is Vite's default behaviour:

1. **`html-at-url-segment`** renames emitted HTML in `generateBundle`. Vite writes each page
   to its path relative to root — `dist/apps/<slug>/` — which is one directory deeper than the
   URL. The plugin rewrites `fileName` to `<slug>/index.html`, and portfolio's to `index.html`.
2. **The one `publicDir`** is the repo root's `public/`, copied verbatim to the artifact root.
   Per-app assets live under `public/<slug>/` so they land at `/<slug>/`.
3. **A static page is just a `public/` subdirectory.** `public/simple-city/` is copied, never
   parsed. That is all `type: "static"` means.
4. **The nav is one more Rollup entry**, not a second bundler. `sites.json` and `nav.css` are
   inlined through `define`, and `entryFileNames` opts that one chunk out of content hashing so
   it lands at a stable `/_nav/nav.js`.
5. **`nav-at-fixed-path` injects the nav tag** via `transformIndexHtml`, into every page Vite
   parses and only those. A page copied from `public/` carries the tag in its own source.

One page failing fails the build: six sites deploy together or not at all.

What this does *not* do, which the script did: validate that every `sites.json` row matches a
real directory. A row pointing at nothing now produces a broken nav link rather than a failed
build. `npm run test:e2e` catches it, because it walks every row.

## Routing

There is none. No router, no redirects, no config. URLs resolve by static file lookup against
the assembled `dist/`, which is why invariant 1 matters.

`sites.json` is **not** load-bearing for serving. It drives the nav drawer and the hub grid
only. A wrong row makes the nav wrong; it cannot 404 anything. A folder with no row still
serves — that is what `tier: "hidden"` means.

Consequence worth knowing before you reach for client-side routing: one Pages site gets one
root `404.html`. Deep links like `/quick/base64` need the `404.html`-restores-the-path trick,
and after consolidation that fallback is global and must dispatch on the path prefix.

## The nav

`packages/nav/` is one framework-agnostic web component, injected at build rather than
imported per app. It has to be: `simple-city` is plain HTML, and the apps disagree on styling
(Tailwind v4, styled-components, hand-rolled CSS). Shadow DOM keeps that isolation in both
directions.

It carries a top-frame guard — `if (window.self !== window.top) return;` — because the
portfolio iframes `simple-city` into its hero background. Removing that guard puts a nav
button inside the hero.

## Landmines

- **A static page's nav tag is hand-written and can be forgotten.** Vite injects the tag into
  every page it parses; `public/simple-city/index.html` is copied, so its tag is checked in.
  Delete it and that page silently loses the nav. The e2e suite asserts a working drawer on
  every row in `sites.json`, which is what makes this recoverable rather than a production bug.
- **Never commit a `CNAME` outside `public/`.** Only root `public/CNAME` may exist. An apex
  `CNAME` in a subdirectory competes with the user site for the domain. `apps/musical-cards`
  shipped one before consolidation; it was deleted for this reason. `public/<slug>/` is a
  published directory now, so the same rule applies there.
- `apps/portfolio` builds to `dist/`, not `build/` — uniform with every other app.
- The root is `"type": "module"`, so `__dirname` is unavailable in config files. Use
  `import.meta.dirname`.
- Absolute `/_nav/nav.js` 404s under `npm run dev` — it is a build entry, so it exists only
  in `dist/`. Expected. To see the nav, `npm run build && npm run preview`.

## Installing

`npm install --legacy-peer-deps`. The flag is not optional on npm 10: resolving vitest 4's
peer set crashes arborist with `Cannot read properties of null (reading 'edgesOut')`. It is an
npm bug, not a real dependency conflict — the tree it produces is correct, and `npm ci` from
the committed lockfile is unaffected, which is what CI runs.

## Deploying

Push to `master`, or run the workflow manually (`workflow_dispatch`). `deploy.yml` builds and
publishes the artifact; `ci.yml` builds every page and runs the tests on PRs.

The workflow owns the Pages configuration too: `configure-pages` runs with `enablement: true`,
which switches the repo's Pages source from "Deploy from a branch" to "GitHub Actions" on the
first run. Nothing deploys from a `gh-pages` branch anymore, and no one has to set that in
Settings by hand. If the run logs a permissions error on that step, flip it once at
Settings → Pages → Source → GitHub Actions and it will stay put.
