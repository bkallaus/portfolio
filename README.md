# ben.kallaus.me

Every page on [ben.kallaus.me](https://ben.kallaus.me) lives in this repo and ships as **one**
GitHub Pages artifact. Every site, one `package.json`, one build, one deploy.

| Path | Source | What it is |
| --- | --- | --- |
| [`/`](https://ben.kallaus.me/) | `apps/portfolio` | The hub — about, experience, and links to everything below |
| [`/quick/`](https://ben.kallaus.me/quick/) | `apps/quick` | Dev utilities — converters, generators, encoders |
| [`/musical-cards/`](https://ben.kallaus.me/musical-cards/) | `apps/musical-cards` | Sight-reading practice with generated staves (VexFlow + Tone.js) |
| [`/poke-search/`](https://ben.kallaus.me/poke-search/) | `apps/poke-search` | Pokémon lookup |
| [`/battle-helper/`](https://ben.kallaus.me/battle-helper/) | `apps/battle-helper` | Damage calc / battle assistant |
| [`/prism-duel/`](https://ben.kallaus.me/prism-duel/) | `public/prism-duel` + `apps/prism-duel/play` | Original two-player gem duel: write-up, and the game at `/prism-duel/play/` |
| [`/duel/`](https://ben.kallaus.me/duel/) | `public/duel` + `apps/duel/play` | Two-player strategy card game: write-up, and the game at `/duel/play/` |
| [`/simple-city/`](https://ben.kallaus.me/simple-city/) | `public/simple-city` | Plain-HTML toy, also the portfolio's hero background |

## Getting started

Node 24 (see `.nvmrc`).

```bash
npm install --legacy-peer-deps
npm run dev        # one dev server, all pages, at their production URLs
```

`npm run dev` serves `apps/portfolio` at `/` and every other page at its production URL, so
what you see locally is the URL you ship. Vite's dev server would otherwise serve them from
`/apps/<slug>/`; a small middleware in `vite.config.ts` rewrites that away.

The `--legacy-peer-deps` flag is not optional on npm 10 — resolving vitest 4's peer set
crashes npm's arborist. It is an npm bug, not a real conflict; CI runs `npm ci` from the
committed lockfile and is unaffected.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server for all pages at production URLs |
| `npm run build` | `vite build` — the whole site into `dist/`, and the whole deploy |
| `npm run preview` | Serve the assembled `dist/` |
| `npm test` | Vitest across every app, the `sites.json` check, then every `apps/*/test/run.ts` |
| `npx vitest run apps/quick` | One app's unit tests |
| `npm run test:e2e` | Playwright against the built `dist/` |
| `npm run typecheck` | `tsc --noEmit` across all apps |
| `npm run lint` | Biome over every `.ts` / `.tsx` file |

## How it's put together

**One root `package.json`.** No workspaces, no per-app manifest, no per-app lockfile. Every
app builds against one version of everything (React 19, Vite 8, TypeScript 5.9), so an upgrade
for one app is an upgrade for all of them — which is what CI exists to catch.

**One Vite build, and nothing around it.** `npm run build` is `vite build`. `vite.config.ts`
walks `apps/` and makes one Rollup entry per `index.html` it finds, so the whole site shares a
single hashed asset graph. A plugin, `html-at-url-segment`, renames each emitted page from its
source path to its URL, and the root `public/` (which carries `CNAME`, each page's assets under
`public/<slug>/`, and any static page) is copied verbatim to the artifact root. One app failing
fails the whole build on purpose.

**A page's directory name is its URL segment.** `apps/quick` serves `/quick/`,
`apps/duel/play` serves `/duel/play/`, and a static page like `public/simple-city/` serves
`/simple-city/`. There is no router and no redirect config — URLs resolve by static file lookup
against the assembled `dist/`. `apps/portfolio` is the one exception: it is the hub and serves
`/`.

**`sites.json` is the list of pages, read through `sites.ts`.** It drives the hub's project
grid and the e2e sweep, not serving. Each row carries a `slug`, a `title`, an optional `blurb`
and `tech`, and an optional `tier` that defaults to `experiment` — you opt *in* to the featured
showcase, so an unfinished project can't leak into the public persona by forgetting a flag.
`npm test` fails if a row and the directories disagree.

## Adding a site

1. Pick the slug — it is the URL and the directory name, so pick it deliberately.
2. Add the source. A Vite app is `apps/<slug>/index.html` plus `src/`; a static page is
   `public/<slug>/` and its files, copied verbatim. Static assets go under `public/<slug>/`.
3. Add a row to `sites.json`.
4. Put any new dependencies in the root `package.json` and `npm install --legacy-peer-deps` at
   the root.
5. `npm test`, then `npm run test:e2e`.

That is the whole list. There is no Vite, Vitest, TypeScript, CI or hub config to touch: build
entries, unit tests, engine suites and typechecking all find the new directory by glob. See
`AGENTS.md` for the details.

## Deploying

Push to `master`, or run the workflow manually. `.github/workflows/deploy.yml` builds and
publishes the artifact; `ci.yml` builds every page, typechecks, and runs the tests on PRs.

The workflow owns the Pages configuration too — `configure-pages` runs with `enablement: true`,
which switches the repo's Pages source to GitHub Actions. Nothing deploys from a `gh-pages`
branch.

## Gotchas

- **Never commit a `CNAME` outside `public/`.** Only root `public/CNAME` may exist — an apex
  `CNAME` in a subdirectory competes with the user site for the domain.
- The root is `"type": "module"`, so `__dirname` is unavailable in config files. Use
  `import.meta.dirname`.
- One Pages site gets one root `404.html`, so client-side deep links (e.g. `/quick/base64`)
  would need a global fallback that dispatches on the path prefix.

`AGENTS.md` has the same ground rules written for coding agents.
