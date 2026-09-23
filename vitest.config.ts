import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'apps',
          include: ['apps/*/src/**/*.test.{ts,tsx,jsx}'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        test: {
          name: 'repo',
          include: ['*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
