import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Site = { slug: string; type: 'vite' | 'static' };

const sites: Site[] = JSON.parse(
  readFileSync(path.join(import.meta.dirname, 'sites.json'), 'utf8'),
);

// One entry per page, so the whole site shares one hashed asset graph.
const input = Object.fromEntries(
  sites
    .filter((s) => s.type === 'vite')
    .map((s) => [s.slug, path.join(import.meta.dirname, 'apps', s.slug, 'index.html')]),
);

// The dev server would serve /apps/quick/, since that is where the file lives.
// Production serves /quick/. Rewrite so you develop against the URL you ship.
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
