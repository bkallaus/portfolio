import React, { useState, useEffect } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// Mock Tone.js because it requires Web Audio API which is not fully supported in JSDOM
vi.mock('tone', () => {
  return {
    Synth: vi.fn().mockImplementation(() => {
      return {
        toDestination: vi.fn().mockReturnThis(),
        triggerAttackRelease: vi.fn(),
      };
    }),
    now: vi.fn(),
    gainToDb: vi.fn((gain) => gain),
    Destination: {
        volume: {
            value: 0
        }
    }
  };
});

test('renders learn react link', () => {
  // This test was failing because "learn react" is not in the App component anymore.
  // The App component renders: "What note is this?"
  const { getByText } = render(<App />);
  const linkElement = getByText(/What note is this\?/i);
  expect(linkElement).toBeInTheDocument();
});
