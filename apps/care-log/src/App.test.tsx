import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEY } from './care';

beforeEach(() => window.localStorage.clear());

const addPerson = async (name: string) => {
  await userEvent.type(screen.getByLabelText("New person's name"), name);
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
};

describe('Care Log', () => {
  it('prompts to add someone when empty', () => {
    render(<App />);
    expect(screen.getByText(/Add someone above/)).toBeInTheDocument();
  });

  it('logs a medication and shows it as the latest', async () => {
    render(<App />);
    await addPerson('Grandma');
    await userEvent.click(screen.getByRole('radio', { name: 'Medication' }));
    await userEvent.type(screen.getByLabelText('Medication name'), 'Metformin');
    await userEvent.type(screen.getByLabelText('Dose'), '500mg');
    await userEvent.click(screen.getByRole('button', { name: 'Log medication' }));

    const card = screen.getByRole('listitem', { name: 'Last medication' });
    expect(within(card).getByText('just now')).toBeInTheDocument();
    expect(within(card).getByText('Metformin · 500mg')).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Last feeding' })).getByText('Nothing logged yet')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').entries).toHaveLength(1);
  });

  it('keeps each person’s history separate', async () => {
    render(<App />);
    await addPerson('Ada');
    await userEvent.type(screen.getByLabelText('Food'), 'Oatmeal');
    await userEvent.click(screen.getByRole('button', { name: 'Log feeding' }));
    await addPerson('Bo');
    expect(screen.getByRole('tab', { name: 'Bo' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('No entries yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Ada' }));
    expect(screen.getByRole('button', { name: 'Delete Oatmeal' })).toBeInTheDocument();
  });
});
