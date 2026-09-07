import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * One test config for the whole site. Each app that has tests is a project, so its
 * setup files stay its own while the runner, environment and dependency versions are
 * shared with everything else.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'musical-cards',
          root: 'apps/musical-cards',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/jest-setup.js', './src/setupTests.jsx'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'quick',
          root: 'apps/quick',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
