import { vi } from 'vitest';

globalThis.jest = vi;
window.jest = vi;

await import('@testing-library/jest-dom/vitest');
await import('jest-canvas-mock');
