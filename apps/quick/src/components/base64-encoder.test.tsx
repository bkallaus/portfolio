import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Base64Encoder from './base64-encoder';

describe('Base64Encoder', () => {
  test('renders component properly', () => {
    render(<Base64Encoder />);
    expect(screen.getByText('Base64 Encoder/Decoder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter plain text...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter base64...')).toBeInTheDocument();
  });

  test('encodes plain text to base64', () => {
    render(<Base64Encoder />);
    const plainInput = screen.getByPlaceholderText('Enter plain text...');
    const base64Input = screen.getByPlaceholderText('Enter base64...');

    fireEvent.change(plainInput, { target: { value: 'Hello World' } });

    expect(base64Input).toHaveValue('SGVsbG8gV29ybGQ=');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('decodes base64 to plain text', () => {
    render(<Base64Encoder />);
    const plainInput = screen.getByPlaceholderText('Enter plain text...');
    const base64Input = screen.getByPlaceholderText('Enter base64...');

    fireEvent.change(base64Input, { target: { value: 'SGVsbG8gV29ybGQ=' } });

    expect(plainInput).toHaveValue('Hello World');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('displays error on invalid base64 input', () => {
    render(<Base64Encoder />);
    const base64Input = screen.getByPlaceholderText('Enter base64...');

    // An invalid base64 string
    fireEvent.change(base64Input, { target: { value: 'invalid!@#$' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to decode: invalid Base64 string.');
  });
});
