---
name: app-structure
description: Use this skill when building a new side app, adding a site, or organizing an application folder structure in this repository.
---

# App Folder Structure for New Side Apps

When building a new side app in this repository, follow the app folder structure and repository conventions outlined below.

## Directory Placement

- **Vite / React Apps:** Place the app under `apps/<slug>/`.
  - Main HTML file: `apps/<slug>/index.html`
  - Source code: `apps/<slug>/src/` (e.g. `main.tsx`, `App.tsx`)
  - No per-app `vite.config.ts` or `package.json`.
- **Static HTML Pages:** Place under `public/<slug>/`.
  - Main HTML file: `public/<slug>/index.html`
  - Source assets: HTML, JS, CSS served verbatim.

## Key Rules & Architectural Principles

1. **URL Segment Matches Directory Name**
   - The directory name (`apps/<slug>` or `public/<slug>`) determines the URL path (`/<slug>/`).
   - Exception: `apps/portfolio` is the hub and serves at `/`.

2. **Single Root `package.json`**
   - All dependencies are managed at the repository root.
   - Do not create per-app `package.json` or lockfiles.
   - Install new packages at the root with `npm install --legacy-peer-deps`.

3. **No Per-App Vite Config**
   - The root `vite.config.ts` automatically discovers apps configured in `sites.json`.

4. **TypeScript Only**
   - All new app source code must be `.ts` or `.tsx`.
   - JavaScript (`.js` / `.jsx`) is strictly for legacy files or tools loading JS directly.

5. **Static Asset Location**
   - Place app assets in `public/<slug>/` so they land at `/<slug>/` in production.
   - Do not create a nested `public/` directory inside `apps/<slug>/`.

6. **Site Manifest Registration (`sites.json`)**
   - Register the app in `sites.json`:
     ```json
     {
       "slug": "my-new-app",
       "type": "vite",
       "tier": "experiment",
       "title": "My New App",
       "blurb": "Optional short description"
     }
     ```
   - `tier` defaults to `"experiment"`. Set to `"featured"` only when showcasing on the portfolio hub.

7. **Navigation Component Integration**
   - Vite apps automatically get the shared nav drawer injected during build.
   - Static pages under `public/<slug>/` must manually include the nav script tag before `</body>`.

8. **Strict No Comments Rule**
   - Do not include inline, block, or JSDoc comments in source files.
   - Make code self-documenting through well-named functions and descriptive variables.

## Step-by-Step Walkthrough: Creating a Vite Side App

1. **Choose a URL slug:** e.g., `my-app`.
2. **Create entry HTML at `apps/my-app/index.html`:**
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
3. **Create `apps/my-app/src/main.tsx`:**
   ```tsx
   import { StrictMode } from 'react';
   import { createRoot } from 'react-dom/client';
   import { App } from './App';
   import './index.css';

   const rootElement = document.getElementById('root');
   if (rootElement) {
     createRoot(rootElement).render(
       <StrictMode>
         <App />
       </StrictMode>
     );
   }
   ```
4. **Create `apps/my-app/src/App.tsx`:**
   ```tsx
   export function App() {
     return (
       <main className="min-h-screen p-8">
         <h1 className="text-3xl font-bold">My New Side App</h1>
       </main>
     );
   }
   ```
5. **Add entry to `sites.json`:**
   ```json
   {
     "slug": "my-app",
     "type": "vite",
     "tier": "experiment",
     "title": "My App"
   }
   ```
6. **Verify build and tests:**
   - Run `npm run build`
   - Confirm `dist/my-app/index.html` exists and references `/_nav/nav.js`
   - Run `npm run test:e2e`
