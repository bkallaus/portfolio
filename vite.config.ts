import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { HUB_SLUG } from './sites.ts';

const here = import.meta.dirname;
const appsDir = path.join(here, 'apps');
const notPages = new Set(['src', 'test', 'node_modules']);

function pagesUnder(dir: string): string[] {
  const pages = existsSync(path.join(dir, 'index.html')) ? [path.join(dir, 'index.html')] : [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !notPages.has(entry.name)) {
      pages.push(...pagesUnder(path.join(dir, entry.name)));
    }
  }
  return pages;
}

const appSlugs = readdirSync(appsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const input = Object.fromEntries(
  appSlugs
    .flatMap((slug) => pagesUnder(path.join(appsDir, slug)))
    .map((page) => [path.relative(appsDir, path.dirname(page)).replaceAll(path.sep, '-'), page])
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
        output.fileName = slug === HUB_SLUG ? rest : `${slug}/${rest}`;
      }
    },
  };
}

function servedFromApps(urlPath: string): boolean {
  const target = path.join(here, 'apps', urlPath);
  if (!existsSync(target)) return false;
  return statSync(target).isFile() || existsSync(path.join(target, 'index.html'));
}

function staticIndexIn(pathname: string): boolean {
  return pathname.endsWith('/') && existsSync(path.join(here, 'public', pathname, 'index.html'));
}

function urlsMatchProduction(): Plugin {
  const slugs = appSlugs.filter((slug) => slug !== HUB_SLUG);
  return {
    name: 'urls-match-production',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/';
        if (url === '/' || url === '/index.html') {
          req.url = `/apps/${HUB_SLUG}/index.html`;
          return next();
        }
        const [pathname] = url.split('?');
        const slug = pathname.split('/')[1];
        if (slugs.includes(slug) && servedFromApps(pathname)) req.url = `/apps${url}`;
        else if (staticIndexIn(pathname)) req.url = `${pathname}index.html`;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), htmlAtUrlSegment(), urlsMatchProduction()],
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
