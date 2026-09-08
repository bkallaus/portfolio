import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
      {
        plugins: [react()],
        test: {
          name: 'neural-race',
          root: 'apps/neural-race',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'portfolio',
          root: 'apps/portfolio',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/setupTests.ts'],
        },
      },
    ],
  },
});
