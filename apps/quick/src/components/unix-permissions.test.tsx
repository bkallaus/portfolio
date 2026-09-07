import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnixPermissions from './unix-permissions';

describe('UnixPermissions Component', () => {
  it('renders with default 644 permissions', () => {
    render(<UnixPermissions />);

    const octalInput = screen.getByLabelText(/Octal/i);
    expect(octalInput).toHaveValue('644');

    const symbolicInput = screen.getByLabelText(/Symbolic/i);
    expect(symbolicInput).toHaveValue('rw-r--r--');

    const ownerRead = screen.getByRole('checkbox', { name: 'owner read' });
    const ownerWrite = screen.getByRole('checkbox', { name: 'owner write' });
    const ownerExecute = screen.getByRole('checkbox', { name: 'owner execute' });

    expect(ownerRead).toBeChecked();
    expect(ownerWrite).toBeChecked();
    expect(ownerExecute).not.toBeChecked();
  });

  it('updates octal and symbolic when checkboxes change', () => {
    render(<UnixPermissions />);

    const ownerExecute = screen.getByRole('checkbox', { name: 'owner execute' });
    fireEvent.click(ownerExecute); // 644 -> 744

    const octalInput = screen.getByLabelText(/Octal/i);
    expect(octalInput).toHaveValue('744');

    const symbolicInput = screen.getByLabelText(/Symbolic/i);
    expect(symbolicInput).toHaveValue('rwxr--r--');
  });

  it('updates checkboxes and symbolic when octal changes', () => {
    render(<UnixPermissions />);

    const octalInput = screen.getByLabelText(/Octal/i);
    fireEvent.change(octalInput, { target: { value: '755' } });

    const symbolicInput = screen.getByLabelText(/Symbolic/i);
    expect(symbolicInput).toHaveValue('rwxr-xr-x');

    const groupExecute = screen.getByRole('checkbox', { name: 'group execute' });
    expect(groupExecute).toBeChecked();
  });

  it('restricts octal input to 3 digits and numbers 0-7', () => {
    render(<UnixPermissions />);

    const octalInput = screen.getByLabelText(/Octal/i);

    fireEvent.change(octalInput, { target: { value: '899' } });
    // Filtered out entirely because they are > 7, so string becomes empty '' initially
    // But testing logic depends on our React input handler
    expect(octalInput).toHaveValue('');

    fireEvent.change(octalInput, { target: { value: '7777' } });
    expect(octalInput).toHaveValue('777');
  });
});