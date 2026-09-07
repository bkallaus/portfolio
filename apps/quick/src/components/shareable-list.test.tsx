import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShareableList from './shareable-list';

// Mock clipboard writeText
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
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

describe('ShareableList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationSearch('');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders ShareableList with items from URL', () => {
    setLocationSearch('?Key1=Value1&Key2=Value2');
    const { container } = render(<ShareableList />);

    expect(screen.getByText('Shareable List')).toBeInTheDocument();
    expect(screen.getByText('Key1')).toBeInTheDocument();
    expect(screen.getByText('Value1')).toBeInTheDocument();
    expect(screen.getByText('Key2')).toBeInTheDocument();
    expect(screen.getByText('Value2')).toBeInTheDocument();

    // Check container style
    // The structure is CalculationContainer -> div -> h4, div(items)
    // We want the inner div that wraps items.
    // We can find it by checking parent of items, or explicitly by style.

    // Let's find the article for Key1 and get its parent
    const item = screen.getByText('Key1').closest('article');
    const itemsContainer = item?.parentElement;

    expect(itemsContainer).toHaveStyle({ display: 'flex' });
    // After change, we expect flexDirection: 'column'
    expect(itemsContainer).toHaveStyle({ flexDirection: 'column' });
    expect(itemsContainer).not.toHaveStyle({ flexWrap: 'wrap' });
  });

  test('shows feedback when copy button is clicked', async () => {
    setLocationSearch('?Key1=Value1');
    render(<ShareableList />);

    const copyButton = screen.getByText('Copy');

    // Initial state
    expect(copyButton).toBeInTheDocument();

    // Click button
    fireEvent.click(copyButton);

    // Check clipboard call
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Value1');

    // Check feedback
    // Since state update is async, findByText is safer, but with fake timers we might need act()
    expect(await screen.findByText('Copied!')).toBeInTheDocument();

    // Fast forward timer to check it reverts
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });
});
