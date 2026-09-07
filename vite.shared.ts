/**
 * Shared Vite config factory for every app in this monorepo.
 *
 * WHY THIS EXISTS
 * There is exactly one package.json (at the repo root) and no npm
 * workspaces, so every app is built by *path*:
 *
 *   vite build apps/<slug>
 *
 * Vite resolves that positional argument to apps/<slug>/vite.config.ts and
 * treats apps/<slug> as its project root. Each app's config then calls this
 * factory to get a fully-formed UserConfig.
 *
 * WHY THE SLUG IS PASSED IN EXPLICITLY
 * The repo's root package.json sets "type": "module", so plain CommonJS
 * __dirname is not available inside config files - only import.meta.dirname
 * (or import.meta.url) is. It is tempting to derive the app directory from
 * process.cwd() (since the CLI is invoked as `vite build apps/<slug>` from
 * the repo root), but that is NOT reliable: cwd depends on where the build
 * command happens to be run from (repo root during CI, an app subdirectory
 * during local dev, a different cwd entirely under some task runners), and
 * Vite does not change the process's cwd to match the project root it
 * resolves. The one value that is always correct is the location of the
 * calling vite.config.ts file itself.
 *
 * So every app config MUST call this as:
 *
 *   export default sharedConfig(import.meta.dirname)
 *
 * `import.meta.dirname` in a given app's vite.config.ts always points at
 * apps/<slug>, and the slug is derived from that directory's basename.
 *
 * THE ONE INVARIANT THAT MATTERS
 * apps/<slug> serves from /<slug>/ ... except apps/portfolio, which is the
 * hub and serves from "/". Everything else (outDir, aliases, plugins) is
 * uniform across apps and lives here so app configs stay tiny.
 *
 * USAGE
 *   // apps/quick/vite.config.ts
 *   import sharedConfig from '../../vite.shared';
 *   export default sharedConfig(import.meta.dirname, { tailwind: true });
 *
 *   // apps/musical-cards/vite.config.ts (needs a vitest `test` block merged in)
 *   export default sharedConfig(import.meta.dirname, {
 *     extra: {
 *       test: {
 *         environment: 'jsdom',
 *         setupFiles: ['./src/jest-setup.js', './src/setupTests.jsx'],
 *         globals: true,
 *       },
 *     },
 *   });
 */
import path from 'node:path';
import { mergeConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export interface SharedConfigOptions {
  /**
   * Register @tailwindcss/vite for this app. Only apps that actually use
   * Tailwind (currently: portfolio, quick) should opt in. Defaults to
   * false so every other app doesn't pay for (or accidentally depend on)
   * the Tailwind plugin.
   */
  tailwind?: boolean;
  /**
   * Extra Vite config to merge on top of the shared base (e.g. a vitest
   * `test` block). Merged with vite's own mergeConfig so arrays/objects
   * combine sensibly instead of clobbering the shared defaults.
   */
  extra?: UserConfig;
}

/**
 * Build the Vite config for one app.
 *
 * @param appDir - MUST be `import.meta.dirname` from the calling app's own
 *   vite.config.ts. This is how the app's slug (and therefore its base
 *   path and its `@` alias target) is derived. Do not pass a hardcoded
 *   string or derive this from process.cwd() - see the file header comment
 *   for why that's unreliable.
 * @param options - Optional per-app overrides (tailwind opt-in, extra
 *   config to merge).
 */
export default function sharedConfig(
  appDir: string,
  options: SharedConfigOptions = {},
): UserConfig {
  const { tailwind = false, extra = {} } = options;

  const slug = path.basename(appDir);
  const isPortfolio = slug === 'portfolio';

  const plugins: UserConfig['plugins'] = [react()];
  if (tailwind) {
    plugins.push(tailwindcss());
  }

  const base: UserConfig = {
    // The hub (portfolio) owns "/"; every other app owns /<slug>/.
    base: isPortfolio ? '/' : `/${slug}/`,
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(appDir, 'src'),
      },
    },
    build: {
      // Uniform outDir across every app (portfolio used to use "build" -
      // it now matches everyone else so build-all.mjs can treat all apps
      // identically).
      outDir: 'dist',
    },
  };

  return mergeConfig(base, extra);
}
