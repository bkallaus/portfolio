import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoremIpsum from './lorem-ipsum';

describe('LoremIpsum', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders the component with default values', () => {
    render(<LoremIpsum />);
    expect(screen.getByText('Lorem Ipsum Generator')).toBeInTheDocument();
    expect(screen.getByLabelText('Paragraphs:')).toHaveValue(3);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
  });

  it('generates text when Generate button is clicked', () => {
    render(<LoremIpsum />);
    const generateButton = screen.getByRole('button', { name: 'Generate' });

    // Textarea shouldn't exist initially
    expect(screen.queryByRole('textbox', { name: 'Generated lorem ipsum text' })).not.toBeInTheDocument();

    fireEvent.click(generateButton);

    const textarea = screen.getByRole('textbox', { name: 'Generated lorem ipsum text' });
    expect(textarea).toBeInTheDocument();
    expect(textarea.textContent).not.toBe('');
  });

  it('updates paragraph count and generates correct number of paragraphs', () => {
    render(<LoremIpsum />);
    const input = screen.getByLabelText('Paragraphs:');
    const generateButton = screen.getByRole('button', { name: 'Generate' });

    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.click(generateButton);

    const textarea = screen.getByRole('textbox', { name: 'Generated lorem ipsum text' });
    const text = textarea.textContent || '';
    const paragraphs = text.split('\n\n');

    expect(paragraphs.length).toBe(2);
  });

  it('copies text to clipboard when Copy button is clicked', () => {
    render(<LoremIpsum />);
    const generateButton = screen.getByRole('button', { name: 'Generate' });

    fireEvent.click(generateButton);

    const copyButton = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
