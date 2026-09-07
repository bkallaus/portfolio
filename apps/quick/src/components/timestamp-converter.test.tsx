import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimestampConverter from './timestamp-converter';

describe('TimestampConverter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly', () => {
    render(<TimestampConverter />);
    expect(screen.getByText('Timestamp Converter')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 1672531200')).toBeInTheDocument();
  });

  it('converts timestamp in seconds correctly', () => {
    render(<TimestampConverter />);
    const input = screen.getByPlaceholderText('e.g. 1672531200');
    fireEvent.change(input, { target: { value: '1672574400' } });

    const utcInput = screen.getAllByRole('textbox')[2] as HTMLInputElement;
    expect(utcInput.value).toContain('Sun, 01 Jan 2023 12:00:00 GMT');
  });

  it('converts timestamp in milliseconds correctly', () => {
    render(<TimestampConverter />);
    const input = screen.getByPlaceholderText('e.g. 1672531200');
    fireEvent.change(input, { target: { value: '1672574400000' } });

    const utcInput = screen.getAllByRole('textbox')[2] as HTMLInputElement;
    expect(utcInput.value).toContain('Sun, 01 Jan 2023 12:00:00 GMT');
  });

  it('handles "Now" button click', () => {
    render(<TimestampConverter />);
    const nowButton = screen.getByText('Now');
    fireEvent.click(nowButton);

    const input = screen.getByPlaceholderText('e.g. 1672531200') as HTMLInputElement;
    expect(input.value).toBe('1672574400000'); // Based on mock time

    const utcInput = screen.getAllByRole('textbox')[2] as HTMLInputElement;
    expect(utcInput.value).toContain('Sun, 01 Jan 2023 12:00:00 GMT');
  });

  it('handles invalid input gracefully', () => {
    render(<TimestampConverter />);
    const input = screen.getByPlaceholderText('e.g. 1672531200');
    fireEvent.change(input, { target: { value: 'abc' } });

    const localInput = screen.getAllByRole('textbox')[1] as HTMLInputElement;
    const utcInput = screen.getAllByRole('textbox')[2] as HTMLInputElement;

    expect(localInput.value).toBe('Invalid timestamp');
    expect(utcInput.value).toBe('Invalid timestamp');
  });
});
