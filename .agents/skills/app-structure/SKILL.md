---
name: app-structure
description: Use this skill when building a new side app, adding a site, or organizing an application folder structure in this repository.
---

# Adding a Side App

The rules (URL = directory name, one root `package.json`, `tier` defaults to `experiment`)
live in the root `AGENTS.md`, under "Three invariants" and "Adding a site". Read those first;
this skill is the copy-paste starting point, not a second copy of the rules.

A new app touches exactly two places: its directory and one row in `sites.json`. If you find
yourself editing `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `package.json` scripts,
a CI workflow, or `public/res_primaryLanguage.json` to wire an app in, stop — the app is in the
wrong place or named the wrong way, because all of those pick it up by glob.

## Where things go

| Thing | Path | Served at |
| --- | --- | --- |
| Vite/React page | `apps/<slug>/index.html` + `apps/<slug>/src/` | `/<slug>/` |
| Extra page for the same app | `apps/<slug>/<sub>/index.html` | `/<slug>/<sub>/` |
| Static, no-build page | `public/<slug>/index.html` | `/<slug>/` |
| Assets (manifest, images) | `public/<slug>/…` | `/<slug>/…` |
| Unit tests | `apps/<slug>/src/**/*.test.tsx` | run by `npm test` |
| Plain-Node test suites | `apps/<slug>/test/run.ts` | run by `npm test` |

Source is TypeScript. No comments in source (see the `no-comments` skill).

## Walkthrough: a Vite app at `/my-app/`

1. `apps/my-app/index.html`:
   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>My App</title>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="./src/main.tsx"></script>
     </body>
   </html>
   ```
2. `apps/my-app/src/main.tsx`:
   ```tsx
   import { StrictMode } from 'react';
   import { createRoot } from 'react-dom/client';
   import { App } from './App';

   const rootElement = document.getElementById('root');
   if (rootElement) {
     createRoot(rootElement).render(
       <StrictMode>
         <App />
       </StrictMode>
     );
   }
   ```
3. `apps/my-app/src/App.tsx`:
   ```tsx
   export function App() {
     return (
       <main className="min-h-screen p-8">
         <h1 className="text-3xl font-bold">My App</h1>
       </main>
     );
   }
   ```
4. Append to `sites.json` (its position in the file is its position on the hub):
   ```json
   {
     "slug": "my-app",
     "title": "My App",
     "blurb": "One line for the hub card",
     "tech": ["react", "typescript"]
   }
   ```
   `tech` values are the keys of the `Tech` type in `sites.ts`; add a badge there if you need
   a new one. Add `"tier": "featured"` only to promote it on the hub.
5. Verify: `npm test` (includes the `sites.json` ↔ directory check), `npm run build`, then
   confirm `dist/my-app/index.html` exists, and finally `npm run test:e2e`.
