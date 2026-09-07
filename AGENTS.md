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

**1. The folder name under `apps/` is the URL segment.** `apps/quick` serves `/quick/`.
`vite.shared.ts` derives Vite's `base` from the directory name, so the folder, the manifest
row, and the URL cannot drift apart. `apps/portfolio` is the one exception — it is the hub
and serves `/`.

**2. There is exactly one `package.json`, at the root.** No workspaces, no per-app manifest,
no per-app lockfile. Every app therefore builds against one version of everything (React 19,
Vite 8, TypeScript 5.9). A new dependency goes in the root manifest; an upgrade for one app
is an upgrade for all six, which is what `ci.yml` exists to catch.

**3. `tier` defaults to `experiment`.** You opt *in* to the showcase, never out of it. A
half-built scratch project cannot leak into the public persona by forgetting a flag.

## Adding a site

1. `mkdir apps/<slug>` — pick the slug you want in the URL. That decision is now made.
2. Add the source. For a Vite app, `apps/<slug>/vite.config.ts` is exactly:

   ```ts
   import sharedConfig from '../../vite.shared';
   export default sharedConfig(import.meta.dirname);
   ```

   Options: `{ tailwind: true }` to add the Tailwind v4 plugin, `{ extra: {...} }` to merge
   anything else. Do not set `base`, `outDir`, or the `@` alias — the shared config owns all
   three, and hardcoding them is the drift this design removes.
   For a static site, no config at all: `index.html` and its assets, copied verbatim.
3. Add a row to `sites.json`. `type` is `"vite"` or `"static"`. Omit `tier` unless you are
   deliberately promoting it to `featured` (needs a `blurb`) or hiding it (`"hidden"`).
4. Add any new dependencies to the root `package.json` and run `npm install` at the root.
5. Add a `dev:<slug>` script mirroring the existing ones.
6. `npm run build`, then confirm three things in the assembled output: `dist/<slug>/index.html`
   exists, its asset URLs start with `/<slug>/`, and the nav `<script>` tag was injected before
   `</body>`.

Done when step 6's three checks pass. A green `npm run build` alone does not prove it — a
wrong `base` builds cleanly and 404s every asset in production.

## How the build assembles

`scripts/build-all.mjs` is the whole deploy. It reads `sites.json`, runs `vite build apps/<slug>`
per Vite app (**by path — there is no `npm run build -w`**), copies static apps verbatim, lays
each result into `dist/` at its URL segment, builds `packages/nav` into `dist/_nav/`, copies
root `public/` (which carries `CNAME`) to the artifact root, and injects the nav script into
every HTML file it produced.

One app failing fails the whole build on purpose: six sites deploy together or not at all.

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

`packages/nav/` is one framework-agnostic web component, injected at assembly rather than
imported per app. It has to be: `simple-city` is plain HTML, and the apps disagree on styling
(Tailwind v4, styled-components, hand-rolled CSS). Shadow DOM keeps that isolation in both
directions.

It carries a top-frame guard — `if (window.self !== window.top) return;` — because the
portfolio iframes `simple-city` into its hero background. Removing that guard puts a nav
button inside the hero.

## Landmines

- **Never commit a `CNAME` inside `apps/`.** Only root `public/CNAME` may exist. An apex
  `CNAME` in a subdirectory competes with the user site for the domain. `apps/musical-cards`
  shipped one before consolidation; it was deleted for this reason.
- `apps/portfolio` builds to `dist/`, not `build/` — uniform with every other app.
- The root is `"type": "module"`, so `__dirname` is unavailable in config files. Use
  `import.meta.dirname`.
- Absolute `/_nav/nav.js` 404s under a single app's `vite preview` (its base is `/<slug>/`).
  Expected — the nav is an assembled-`dist` concern. Use the root `npm run preview`.

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
