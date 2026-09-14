import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Site = { slug: string; type: 'vite' | 'static' };

const here = import.meta.dirname;
const sites: Site[] = JSON.parse(readFileSync(path.join(here, 'sites.json'), 'utf8'));

// Each of these is a static write-up at /<slug>/ (from public/) with the playable
// build at /<slug>/play/. They are not `type: "vite"` rows, so their entries are
// added to the Rollup input by hand below.
const gamesWithWriteups = ['duel', 'prism-duel'];

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
        // A game lives at apps/<slug>/play but deploys at /<slug>/play/, alongside the
        // /<slug>/ write-up served from public/. Mirror that here so dev URLs match
        // production. (/<slug>/ itself falls through to the public/ write-up.)
        for (const slug of gamesWithWriteups) {
          if (url === `/${slug}/play` || url.startsWith(`/${slug}/play/`)) {
            req.url = `/apps/${slug}${url.slice(slug.length + 1)}`;
            return next();
          }
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
      // Each game page rides along as an extra input; htmlAtUrlSegment rewrites
      // apps/<slug>/play/index.html to <slug>/play/index.html, so it deploys at
      // /<slug>/play/.
      input: {
        ...input,
        ...Object.fromEntries(
          gamesWithWriteups.map((slug) => [
            `${slug}-play`,
            path.join(here, 'apps', slug, 'play', 'index.html'),
          ])
        ),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
