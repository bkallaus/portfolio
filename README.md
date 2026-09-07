# ben.kallaus.me

Every page on [ben.kallaus.me](https://ben.kallaus.me) lives in this repo and ships as **one**
GitHub Pages artifact. Six sites, one `package.json`, one build, one deploy.

| Path | Source | What it is |
| --- | --- | --- |
| [`/`](https://ben.kallaus.me/) | `apps/portfolio` | The hub — about, experience, and links to everything below |
| [`/quick/`](https://ben.kallaus.me/quick/) | `apps/quick` | Dev utilities — converters, generators, encoders |
| [`/musical-cards/`](https://ben.kallaus.me/musical-cards/) | `apps/musical-cards` | Sight-reading practice with generated staves (VexFlow + Tone.js) |
| [`/poke-search/`](https://ben.kallaus.me/poke-search/) | `apps/poke-search` | Pokémon lookup |
| [`/battle-helper/`](https://ben.kallaus.me/battle-helper/) | `apps/battle-helper` | Damage calc / battle assistant |
| [`/simple-city/`](https://ben.kallaus.me/simple-city/) | `apps/simple-city` | Plain-HTML toy, also the portfolio's hero background |

## Getting started

Node 24 (see `.nvmrc`).

```bash
npm install --legacy-peer-deps
npm run dev        # one dev server, all pages, at their production URLs
```

`npm run dev` serves `apps/portfolio` at `/` and every other app at `/<slug>/`, so what you
see locally is the URL you ship. Vite's dev server would otherwise serve them from
`/apps/<slug>/`; a small middleware in `vite.config.ts` rewrites that away.

The `--legacy-peer-deps` flag is not optional on npm 10 — resolving vitest 4's peer set
crashes npm's arborist. It is an npm bug, not a real conflict; CI runs `npm ci` from the
committed lockfile and is unaffected.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server for all pages at production URLs |
| `npm run build` | Assemble the full site into `dist/` (this is the whole deploy) |
| `npm run preview` | Serve the assembled `dist/` — the only way to check the shared nav |
| `npm test` | Vitest across every project |
| `npm run test:quick` / `test:musical-cards` | One project's tests |
| `npm run typecheck` | `tsc --noEmit` across all apps |
| `npm run lint` | ESLint over `apps/` |

## How it's put together

**One root `package.json`.** No workspaces, no per-app manifest, no per-app lockfile. All six
apps build against one version of everything (React 19, Vite 8, TypeScript 5.9), so an upgrade
for one app is an upgrade for all of them — which is what CI exists to catch.

**One Vite build.** `vite.config.ts` declares one Rollup entry per app, so the whole site
shares a single hashed asset graph. `scripts/build-all.mjs` then drives the assembly: run the
build, move each page from its source path to its URL segment, copy per-app `public/` dirs,
copy static apps verbatim, build the shared nav into `dist/_nav/`, copy the root `public/`
(which carries `CNAME`) to the artifact root, and inject the nav `<script>` into every HTML
file it produced. One app failing fails the whole build on purpose.

**The folder name under `apps/` is the URL segment.** `apps/quick` serves `/quick/`. There is
no router and no redirect config — URLs resolve by static file lookup against the assembled
`dist/`. `apps/portfolio` is the one exception: it is the hub and serves `/`.

**`sites.json` drives the nav and hub grid, not serving.** A wrong row makes the nav wrong; it
cannot 404 anything. Each row carries a `slug`, a `type` (`"vite"` or `"static"`), and an
optional `tier` that defaults to `experiment` — you opt *in* to the featured showcase, so an
unfinished project can't leak into the public persona by forgetting a flag.

**The nav is a framework-agnostic web component** (`packages/nav/`), injected at assembly time
rather than imported per app. It has to be: `simple-city` is plain HTML, and the apps disagree
on styling (Tailwind v4, styled-components, hand-rolled CSS). Shadow DOM keeps that isolation
in both directions.

## Adding a site

1. `mkdir apps/<slug>` — the slug is the URL, so pick it deliberately.
2. Add the source. Vite apps need an `index.html` at the app root; static sites just need their
   files. No per-app Vite config — the root config picks the app up from `sites.json`.
3. Add a row to `sites.json`. Omit `tier` unless you're deliberately promoting it to `featured`
   (which needs a `blurb`) or hiding it (`"hidden"` — the page still serves).
4. Put any new dependencies in the root `package.json` and `npm install` at the root.
5. `npm run build`, then confirm in the assembled output: `dist/<slug>/index.html` exists, its
   asset URLs resolve (they point at the shared `/assets/` root, not `/<slug>/assets/` — every
   page shares one hashed asset graph), and the nav `<script>` landed before `</body>`.

Step 5 matters — a green build alone doesn't prove it. A page that builds cleanly can still
404 every asset in production.

## Deploying

Push to `master`, or run the workflow manually. `.github/workflows/deploy.yml` builds and
publishes the artifact; `ci.yml` builds every page, typechecks, and runs the tests on PRs.

The workflow owns the Pages configuration too — `configure-pages` runs with `enablement: true`,
which switches the repo's Pages source to GitHub Actions. Nothing deploys from a `gh-pages`
branch.

## Gotchas

- **Never commit a `CNAME` inside `apps/`.** Only root `public/CNAME` may exist — an apex
  `CNAME` in a subdirectory competes with the user site for the domain.
- The root is `"type": "module"`, so `__dirname` is unavailable in config files. Use
  `import.meta.dirname`.
- `/_nav/nav.js` only resolves against the assembled `dist/`. Use `npm run preview`, not a
  single app's dev server, to check the nav.
- One Pages site gets one root `404.html`, so client-side deep links (e.g. `/quick/base64`)
  would need a global fallback that dispatches on the path prefix.

`AGENTS.md` has the same ground rules written for coding agents.
