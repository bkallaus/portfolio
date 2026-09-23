import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

Object.assign(globalThis, { jest: vi });
await import('jest-canvas-mock');
