import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Site = { slug: string; type: 'vite' | 'static' };

const here = import.meta.dirname;
const sites: Site[] = JSON.parse(readFileSync(path.join(here, 'sites.json'), 'utf8'));

const NAV_TAG = '<script type="module" src="/_nav/nav.js" defer></script>';

// One entry per page, so the whole site shares one hashed asset graph. The nav
// rides along as one more entry (see navAtFixedPath) instead of a second bundler.
const input = Object.fromEntries([
  ...sites
    .filter((s) => s.type === 'vite')
    .map((s) => [s.slug, path.join(here, 'apps', s.slug, 'index.html')]),
  ['nav', path.join(here, 'packages', 'nav', 'src', 'nav.js')],
]);

// Vite emits each page at its path relative to root, which is apps/<slug>/. The
// site serves /<slug>/, and the hub serves /. Renaming the emitted HTML is the
// only thing standing between the source layout and the URL layout.
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

// Every page loads the nav from one stable URL, so this entry alone opts out of
// content hashing. Pages built by Vite get the tag injected; a static page in
// public/ carries it in its own HTML, because Vite never parses that file.
function navAtFixedPath(): Plugin {
  const noNav = new Set(sites.filter((s) => (s as { nav?: boolean }).nav === false).map((s) => s.slug));
  return {
    name: 'nav-at-fixed-path',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const slug = path.relative(path.join(here, 'apps'), ctx.filename).split(path.sep)[0];
        if (noNav.has(slug) || html.includes(NAV_TAG)) return html;
        return html.replace('</body>', `  ${NAV_TAG}\n</body>`);
      },
    },
  };
}

// The dev server would serve /apps/quick/, since that is where the file lives.
// Production serves /quick/. Rewrite so you develop against the URL you ship.
// Static pages live in public/ already at their URL, so they are left alone.
function urlsMatchProduction(): Plugin {
  const built = sites.filter((s) => s.type === 'vite' && s.slug !== 'portfolio');
  return {
    name: 'urls-match-production',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/';
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
  plugins: [react(), tailwindcss(), htmlAtUrlSegment(), navAtFixedPath(), urlsMatchProduction()],
  // sites.json and nav.css are inlined at build time, so the published nav never
  // fetches either one at runtime.
  define: {
    __SITES__: JSON.stringify(sites),
    __NAV_CSS__: JSON.stringify(
      readFileSync(path.join(here, 'packages', 'nav', 'src', 'nav.css'), 'utf8'),
    ),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input,
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'nav' ? '_nav/nav.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
