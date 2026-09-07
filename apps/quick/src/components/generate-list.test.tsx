import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShareableList from './generate-list';

// Mock clipboard writeText
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock window.history.pushState
const pushStateMock = jest.fn();
// window.history is usually writable or we can spy on it
Object.defineProperty(window, 'history', {
  value: {
    pushState: pushStateMock,
  },
  writable: true,
});

// Helper to set window.location.search
const setLocationSearch = (search: string) => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      ...window.location,
      search,
      pathname: '/quick',
    },
  });
};

describe('GenerateList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationSearch('');
  });

  test('renders GenerateList component', () => {
    render(<ShareableList />);
    expect(screen.getByText('Generate Shareable List')).toBeInTheDocument();
  });

  test('adds an item to the list and clears input', () => {
    render(<ShareableList />);

    const keyInput = screen.getByPlaceholderText('e.g. Username');
    const valueInput = screen.getByPlaceholderText('e.g. admin');
    const addButton = screen.getByText('Add');

    fireEvent.change(keyInput, { target: { value: 'TestKey' } });
    fireEvent.change(valueInput, { target: { value: 'TestValue' } });
    fireEvent.click(addButton);

    // The items are not rendered in GenerateList, so we can only check inputs cleared
    expect(keyInput).toHaveValue('');
    expect(valueInput).toHaveValue('');
  });
});
