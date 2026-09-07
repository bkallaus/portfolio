
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShareableList from './shareable-list';

// Mock clipboard writeText
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
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
    vi.clearAllMocks();
    setLocationSearch('');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders ShareableList with items from URL', () => {
    setLocationSearch('?Key1=Value1&Key2=Value2');
    render(<ShareableList />);

    expect(screen.getByText('Shareable List')).toBeInTheDocument();
    expect(screen.getByText('Key1')).toBeInTheDocument();
    expect(screen.getByText('Value1')).toBeInTheDocument();
    expect(screen.getByText('Key2')).toBeInTheDocument();
    expect(screen.getByText('Value2')).toBeInTheDocument();
  });

  test('shows feedback when copy button is clicked', () => {
    setLocationSearch('?Key1=Value1');
    render(<ShareableList />);

    const copyButton = screen.getByText('Copy');

    // Initial state
    expect(copyButton).toBeInTheDocument();

    // Click button
    fireEvent.click(copyButton);

    // Check clipboard call
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Value1');

    expect(screen.getByText('Copied!')).toBeInTheDocument();

    // Fast forward timer to check it reverts
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });
});
