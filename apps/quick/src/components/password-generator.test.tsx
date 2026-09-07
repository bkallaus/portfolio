import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest';
import PasswordGenerator from './password-generator';

describe('PasswordGenerator', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders generator UI', () => {
    render(<PasswordGenerator />);
    expect(screen.getByText('Password Generator')).toBeInTheDocument();
    expect(screen.getByLabelText('Length')).toBeInTheDocument();

    // There are multiple checkmarks (one visual span + one actual hidden checkbox input per label)
    // We get the actual checkboxes to check presence.
    expect(screen.getByRole('checkbox', { name: 'Uppercase' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Lowercase' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Numbers' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Symbols' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Generate Password' })).toBeInTheDocument();
    expect(screen.getByLabelText('Generated Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  test('generates password with default length 16', () => {
    render(<PasswordGenerator />);
    const button = screen.getByRole('button', { name: 'Generate Password' });
    fireEvent.click(button);

    const output = screen.getByLabelText('Generated Password') as HTMLInputElement;
    expect(output.value).toHaveLength(16);
  });

  test('updates length when input changes', () => {
    render(<PasswordGenerator />);
    const lengthInput = screen.getByLabelText('Length');
    fireEvent.change(lengthInput, { target: { value: '8' } });

    const button = screen.getByRole('button', { name: 'Generate Password' });
    fireEvent.click(button);

    const output = screen.getByLabelText('Generated Password') as HTMLInputElement;
    expect(output.value).toHaveLength(8);
  });

  test('generates empty password when no options are selected', () => {
    render(<PasswordGenerator />);

    const uppercase = screen.getByRole('checkbox', { name: 'Uppercase' });
    const lowercase = screen.getByRole('checkbox', { name: 'Lowercase' });
    const numbers = screen.getByRole('checkbox', { name: 'Numbers' });
    const symbols = screen.getByRole('checkbox', { name: 'Symbols' });

    fireEvent.click(uppercase);
    fireEvent.click(lowercase);
    fireEvent.click(numbers);
    fireEvent.click(symbols);

    const button = screen.getByRole('button', { name: 'Generate Password' });
    fireEvent.click(button);

    const output = screen.getByLabelText('Generated Password') as HTMLInputElement;
    expect(output.value).toBe('');
  });

  test('copies password to clipboard', async () => {
    render(<PasswordGenerator />);
    const button = screen.getByRole('button', { name: 'Generate Password' });
    fireEvent.click(button);

    const output = screen.getByLabelText('Generated Password') as HTMLInputElement;
    // We expect multiple 'Copy' buttons (one for main, one for the history item we just generated)
    const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
    const copyButton = copyButtons[0]; // main output copy button is first

    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(output.value);
  });

  test('saves generated password to history and displays it', () => {
    render(<PasswordGenerator />);
    const button = screen.getByRole('button', { name: 'Generate Password' });

    fireEvent.click(button);
    const output1 = screen.getByLabelText('Generated Password') as HTMLInputElement;
    const pass1 = output1.value;

    fireEvent.click(button);
    const output2 = screen.getByLabelText('Generated Password') as HTMLInputElement;
    const pass2 = output2.value;

    expect(screen.getByText('History (Last 30 Days)')).toBeInTheDocument();

    // We should have the current password in the main output, and two in history (most recent first)
    const historyInputs = screen.getAllByRole('textbox').filter(el => el !== output2);
    // screen.getAllByRole('textbox') gets all text inputs.
    // 0 is the main Generated Password input. The rest are history.
    const allInputs = screen.getAllByRole('textbox');
    expect(allInputs[0]).toHaveValue(pass2);
    expect(allInputs[1]).toHaveValue(pass2);
    expect(allInputs[2]).toHaveValue(pass1);

    // Verify localStorage
    const stored = JSON.parse(localStorage.getItem('passwordHistory') || '[]');
    expect(stored).toHaveLength(2);
    expect(stored[0].password).toBe(pass2);
    expect(stored[1].password).toBe(pass1);
  });

  test('removes a password from history', () => {
    render(<PasswordGenerator />);
    const button = screen.getByRole('button', { name: 'Generate Password' });

    // Generate two passwords
    fireEvent.click(button);
    fireEvent.click(button);

    // Initial state: 1 main output + 2 history outputs = 3 textboxes
    expect(screen.getAllByRole('textbox')).toHaveLength(3);

    const removeButtons = screen.getAllByRole('button', { name: 'Remove password' });
    expect(removeButtons).toHaveLength(2);

    // Remove the first history item
    fireEvent.click(removeButtons[0]);

    // After removal: 1 main output + 1 history output = 2 textboxes
    expect(screen.getAllByRole('textbox')).toHaveLength(2);

    // Verify localStorage updated
    const stored = JSON.parse(localStorage.getItem('passwordHistory') || '[]');
    expect(stored).toHaveLength(1);
  });
});
