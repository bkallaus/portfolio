import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/musical-cards/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/jest-setup.js', './src/setupTests.jsx'],
    globals: true,
  },
});
