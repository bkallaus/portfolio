import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Site = { slug: string; type: 'vite' | 'static' };

const sites: Site[] = JSON.parse(
  readFileSync(path.join(import.meta.dirname, 'sites.json'), 'utf8'),
);

/**
 * One build, one entry per page. The folder name under apps/ is the URL segment;
 * scripts/build-all.mjs lays each emitted page down at that path. Because this is a
 * single build at base '/', every page shares one hashed asset graph — React and
 * friends are bundled once for the whole site rather than once per app.
 */
const input = Object.fromEntries(
  sites
    .filter((s) => s.type === 'vite')
    .map((s) => [s.slug, path.join(import.meta.dirname, 'apps', s.slug, 'index.html')]),
);

/**
 * Dev only. Production serves /quick/; the dev server would otherwise serve
 * /apps/quick/ because that is where the file lives. This rewrites the former to the
 * latter so the URL you develop against is the URL you ship.
 */
function urlsMatchProduction(): Plugin {
  return {
    name: 'urls-match-production',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/';
        for (const site of sites) {
          if (site.slug === 'portfolio') continue;
          if (url === `/${site.slug}` || url.startsWith(`/${site.slug}/`)) {
            req.url = `/apps/${site.slug}${url.slice(site.slug.length + 1)}`;
            return next();
          }
        }
        if (url === '/' || url === '/index.html') req.url = '/apps/portfolio/index.html';
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), urlsMatchProduction()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input },
  },
});
