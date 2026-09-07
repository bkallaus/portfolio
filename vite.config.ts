import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

type Site = { slug: string; type: 'vite' | 'static' };

const here = import.meta.dirname;
const sites: Site[] = JSON.parse(readFileSync(path.join(here, 'sites.json'), 'utf8'));

const viteSites = sites.filter((s) => s.type === 'vite');

function htmlPages(slug: string): string[] {
  const root = path.join(here, 'apps', slug);
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'index.html') pages.push(full);
    }
  };
  walk(root);
  return pages;
}

function entryName(slug: string, file: string): string {
  const rest = path
    .relative(path.join(here, 'apps', slug), file)
    .replace(/\\/g, '/')
    .replace(/\/?index\.html$/, '');
  const url = slug === 'portfolio' ? rest : rest ? `${slug}/${rest}` : slug;
  return url === '' ? slug : url.replace(/\//g, '-');
}

const input = Object.fromEntries(
  viteSites.flatMap((s) => htmlPages(s.slug).map((file) => [entryName(s.slug, file), file])),
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
  const mounts = viteSites
    .filter((s) => s.slug !== 'portfolio')
    .map((s) => ({ urlPrefix: `/${s.slug}`, fsPrefix: `/apps/${s.slug}` }));

  for (const entry of readdirSync(path.join(here, 'apps', 'portfolio'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (htmlPages(path.join('portfolio', entry.name)).length) {
      mounts.push({
        urlPrefix: `/${entry.name}`,
        fsPrefix: `/apps/portfolio/${entry.name}`,
      });
    }
  }

  mounts.sort((a, b) => b.urlPrefix.length - a.urlPrefix.length);

  return {
    name: 'urls-match-production',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/';
        for (const mount of mounts) {
          if (url === mount.urlPrefix || url.startsWith(`${mount.urlPrefix}/`)) {
            req.url = `${mount.fsPrefix}${url.slice(mount.urlPrefix.length)}`;
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
      input,
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
