import sharedConfig from '../../vite.shared';

export default sharedConfig(import.meta.dirname, {
  extra: {
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/jest-setup.js', './src/setupTests.jsx'],
      globals: true,
    },
  },
});
