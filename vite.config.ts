import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Site = { slug: string; type: 'vite' | 'static' };

const here = import.meta.dirname;
const sites: Site[] = JSON.parse(readFileSync(path.join(here, 'sites.json'), 'utf8'));

const input = Object.fromEntries(
  sites
    .filter((s) => s.type === 'vite')
    .map((s) => [s.slug, path.join(here, 'apps', s.slug, 'index.html')])
);

function htmlAtUrlSegment(): Plugin {
  return {
    name: 'html-at-url-segment',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        const match = /^apps\/([^/]+)\/(.*\.html)$/.exec(output.fileName);
        if (!match) continue;
        const [, slug, rest] = match;
        output.fileName = slug === 'portfolio' ? rest : `${slug}/${rest}`;
      }
    },
  };
}

function urlsMatchProduction(): Plugin {
  const built = sites.filter((s) => s.type === 'vite' && s.slug !== 'portfolio');
  return {
    name: 'urls-match-production',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/';
        // The Duel game lives at apps/duel/play but deploys at /duel/play/,
        // alongside the /duel/ write-up served from public/. Mirror that here
        // so dev URLs match production. (/duel/ itself falls through to the
        // public/ write-up.)
        if (url === '/duel/play' || url.startsWith('/duel/play/')) {
          req.url = `/apps/duel${url.slice('/duel'.length)}`;
          return next();
        }
        for (const site of built) {
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
  plugins: [react(), tailwindcss(), htmlAtUrlSegment(), urlsMatchProduction()],
  define: {
    __SITES__: JSON.stringify(sites),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // The Duel game is a standalone page living under the portfolio's
      // /duel/ write-up, at /duel/play/. It isn't a sites.json app of its
      // own, so it rides along as an extra input; htmlAtUrlSegment rewrites
      // apps/duel/play/index.html to duel/play/index.html, so it deploys at
      // /duel/play/.
      input: { ...input, 'duel-play': path.join(here, 'apps', 'duel', 'play', 'index.html') },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
