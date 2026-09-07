import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WordCounter from './word-counter';

describe('WordCounter', () => {
  it('renders correctly with initial empty state', () => {
    render(<WordCounter />);

    // The component actually renders a div with font-heading, not a heading tag. Let's look for the text.
    expect(screen.getByText('Word Counter')).toBeInTheDocument();

    // Check all stats are 0
    const statValues = screen.getAllByText('0');
    expect(statValues.length).toBeGreaterThanOrEqual(4); // Words, Chars, Sentences, Paragraphs

    expect(screen.getByText(/Characters \(no spaces\): 0/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear Text/i })).toBeDisabled();
  });

  it('calculates counts correctly for a simple text', () => {
    render(<WordCounter />);

    const textarea = screen.getByRole('textbox', { name: /Text to count/i });
    fireEvent.change(textarea, { target: { value: 'Hello world. This is a test.' } });

    // 6 words: Hello, world., This, is, a, test.
    // Length: 28 characters
    // 2 sentences (ending in .)
    // 1 paragraph
    // without spaces: 23

    expect(textarea).toHaveValue('Hello world. This is a test.');
    expect(screen.getByText('6')).toBeInTheDocument(); // Words
    expect(screen.getByText('28')).toBeInTheDocument(); // Chars
    expect(screen.getByText('2')).toBeInTheDocument(); // Sentences
    expect(screen.getByText('1')).toBeInTheDocument(); // Paragraphs
    expect(screen.getByText(/Characters \(no spaces\): 23/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear Text/i })).toBeEnabled();
  });

  it('calculates counts correctly for multi-paragraph text', () => {
    render(<WordCounter />);

    const textarea = screen.getByRole('textbox', { name: /Text to count/i });
    const multiParaText = "First paragraph.\n\nSecond paragraph here!\n\nAnd a third one?";
    fireEvent.change(textarea, { target: { value: multiParaText } });

    // Words: 9
    // Sentences: 3
    // Paragraphs: 3

    expect(screen.getByText('9')).toBeInTheDocument();
    const threeValues = screen.getAllByText('3');
    expect(threeValues.length).toBeGreaterThanOrEqual(2);
  });

  it('clears text when the button is clicked', () => {
    render(<WordCounter />);

    const textarea = screen.getByRole('textbox', { name: /Text to count/i });
    fireEvent.change(textarea, { target: { value: 'Test' } });

    const clearButton = screen.getByRole('button', { name: /Clear Text/i });
    expect(clearButton).toBeEnabled();

    fireEvent.click(clearButton);

    expect(textarea).toHaveValue('');
    expect(clearButton).toBeDisabled();
  });
});
