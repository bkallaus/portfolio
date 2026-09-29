import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecurringChores from './recurring-chores';
import { CHORES_STORAGE_KEY } from '../lib/chores';

const addChore = (name: string, everyDays: string) => {
  fireEvent.change(screen.getByLabelText('Chore'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Every (days)'), { target: { value: everyDays } });
  fireEvent.click(screen.getByRole('button', { name: 'Add chore' }));
};

describe('RecurringChores', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 29, 9));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows an empty state before any chores exist', () => {
    render(<RecurringChores />);
    expect(screen.getByText('No chores yet. Add one above.')).toBeInTheDocument();
  });

  test('a new chore counts as done today', () => {
    render(<RecurringChores />);
    addChore('Water plants', '3');

    const item = screen.getByRole('listitem');
    expect(within(item).getByText('Water plants')).toBeInTheDocument();
    expect(within(item).getByText('Every 3 days · Due in 3 days')).toBeInTheDocument();
    expect(screen.getByLabelText('Chore')).toHaveValue('');
  });

  test('marking an overdue chore done resets its due date', () => {
    localStorage.setItem(
      CHORES_STORAGE_KEY,
      JSON.stringify([{ id: 'a', name: 'Mop floors', everyDays: 7, lastDone: '2026-09-19' }]),
    );
    render(<RecurringChores />);
    expect(screen.getByText('Every 7 days · Overdue by 3 days')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark Mop floors done' }));

    expect(screen.getByText('Every 7 days · Due in 7 days')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CHORES_STORAGE_KEY) ?? '[]')[0].lastDone).toBe('2026-09-29');
  });

  test('removing a chore drops it from the list and storage', () => {
    render(<RecurringChores />);
    addChore('Clean fridge', '14');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Clean fridge' }));

    expect(screen.queryByText('Clean fridge')).not.toBeInTheDocument();
    expect(localStorage.getItem(CHORES_STORAGE_KEY)).toBe('[]');
  });

  test('lists the most overdue chore first', () => {
    render(<RecurringChores />);
    addChore('Change sheets', '14');
    addChore('Take out trash', '2');

    const names = screen.getAllByRole('listitem').map((item) => within(item).getByRole('heading').textContent);
    expect(names).toEqual(['Take out trash', 'Change sheets']);
  });
});
