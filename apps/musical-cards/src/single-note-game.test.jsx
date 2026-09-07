import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SingleNoteGame from './single-note-game';

vi.useFakeTimers();

// Mock Tone.js
vi.mock('tone', () => ({
  Synth: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
  })),
  now: vi.fn(),
  Destination: {
      volume: {
          value: 0
      }
  }
}));

// Mock VexFlow Score component
vi.mock('./vex-flow', () => ({
  Score: ({ keys }) => <div data-testid="score-mock" data-keys={keys ? keys.join(',') : ''}>Score</div>
}));

// Mock VolumeControl
vi.mock('./volume-control', () => ({
  default: () => <div data-testid="volume-control-mock">VolumeControl</div>
}));

const notes = [
  { answer: 'c', note: 'c/4' },
  { answer: 'd', note: 'd/4' },
  { answer: 'e', note: 'e/4' }
];

test('shows "Time\'s up!" after 10 seconds', () => {
  render(<SingleNoteGame notes={notes} clef="treble" />);

  // Initially no feedback
  expect(screen.queryByText(/Time's up/i)).not.toBeInTheDocument();

  // Advance time by 10s
  act(() => {
      vi.advanceTimersByTime(10000);
  });

  // Check feedback
  expect(screen.getByText(/Time's up/i)).toBeInTheDocument();
});

test('resets timer on interaction', () => {
  render(<SingleNoteGame notes={notes} clef="treble" />);

  // Advance 5s
  act(() => {
      vi.advanceTimersByTime(5000);
  });

  // Click a button (simulating interaction)
  const buttons = screen.getAllByRole('button');
  fireEvent.click(buttons[0]); // Click first button

  // Advance another 5s (total 10s from start)
  act(() => {
      vi.advanceTimersByTime(5000);
  });

  // Should NOT show "Time's up!" yet (because timer reset at 5s)
  expect(screen.queryByText(/Time's up/i)).not.toBeInTheDocument();

  // Advance another 5s (total 10s from interaction)
  act(() => {
      vi.advanceTimersByTime(5000);
  });

  // Now should show "Time's up!"
  expect(screen.getByText(/Time's up/i)).toBeInTheDocument();
});

test('picks new note and shows feedback on incorrect answer', () => {
    render(<SingleNoteGame notes={notes} clef="treble" />);

    // Get current note from score mock
    const score = screen.getByTestId('score-mock');
    const currentNoteKey = score.getAttribute('data-keys');
    const currentNoteObj = notes.find(n => n.note === currentNoteKey);
    const correctAns = currentNoteObj.answer;

    // Find a button that is INCORRECT
    const buttons = screen.getAllByRole('button');
    const wrongButton = buttons.find(btn => btn.textContent !== correctAns);

    // Click wrong button
    fireEvent.click(wrongButton);

    // Should show feedback "Wrong! It was ..."
    expect(screen.getByText(new RegExp(`Wrong! It was ${correctAns.toUpperCase()}`, 'i'))).toBeInTheDocument();

    // Should have picked a NEW note
    // Note: The mock `Score` component updates immediately.
    // However, since `pickNewNote` is random, there's a tiny chance it picks the same note IF we didn't force it not to.
    // But `pickNewNote` implementation explicitly loops while nextNote.answer === currentNote.answer.
    // So it MUST be different.

    // We need to re-query the score because the component re-rendered
    const newScore = screen.getByTestId('score-mock');
    const newNoteKey = newScore.getAttribute('data-keys');

    expect(newNoteKey).not.toBe(currentNoteKey);
});