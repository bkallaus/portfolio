import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UrlParser from './url-parser';

describe('UrlParser', () => {
  it('renders correctly', () => {
    render(<UrlParser />);
    expect(screen.getByRole('heading', { name: /url parser/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /enter url/i })).toBeInTheDocument();
  });

  it('parses a full URL and displays components', () => {
    render(<UrlParser />);
    const input = screen.getByRole('textbox', { name: /enter url/i });
    fireEvent.change(input, { target: { value: 'https://example.com:8080/path/to/page?query=param#section1' } });

    expect(screen.getByText('https:')).toBeInTheDocument();
    expect(screen.getByText('example.com:8080')).toBeInTheDocument();
    expect(screen.getByText('8080')).toBeInTheDocument();
    expect(screen.getByText('/path/to/page')).toBeInTheDocument();
    expect(screen.getByText('?query=param')).toBeInTheDocument();
    expect(screen.getByText('#section1')).toBeInTheDocument();

    // Query params table
    expect(screen.getByRole('cell', { name: 'query' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'param' })).toBeInTheDocument();
  });

  it('adds http protocol if missing', () => {
    render(<UrlParser />);
    const input = screen.getByRole('textbox', { name: /enter url/i });
    fireEvent.change(input, { target: { value: 'google.com/search?q=test' } });

    expect(screen.getByText('http:')).toBeInTheDocument(); // Falls back to http
    expect(screen.getByText('google.com')).toBeInTheDocument();
    expect(screen.getByText('/search')).toBeInTheDocument();

    // Query params table
    expect(screen.getByRole('cell', { name: 'q' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'test' })).toBeInTheDocument();
  });

  it('shows error for completely invalid URL', () => {
    render(<UrlParser />);
    const input = screen.getByRole('textbox', { name: /enter url/i });
    // Something that new URL() will throw on even with http:// prepended
    // Actually http://http:// is invalid host sometimes, but let's test a very broken url
    // To reliably trigger new URL() error, we can use an invalid protocol or malformed characters
    fireEvent.change(input, { target: { value: 'http://%invalid_host' } });

    expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
  });

  it('clears parsed results when input is empty', () => {
    render(<UrlParser />);
    const input = screen.getByRole('textbox', { name: /enter url/i });

    fireEvent.change(input, { target: { value: 'https://example.com' } });
    expect(screen.getByText('https:')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByText('https:')).not.toBeInTheDocument();
  });
});
