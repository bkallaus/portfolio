import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnixPermissions from './unix-permissions';

// Every column shows the same three labels ("Read (4)"...), so a checkbox is only
// identifiable via its group. That is exactly how a screen reader reads it too.
const checkbox = (entity: string, permission: RegExp) =>
  within(screen.getByRole('group', { name: new RegExp(entity, 'i') })).getByRole('checkbox', {
    name: permission,
  });

describe('UnixPermissions Component', () => {
  it('renders with default 644 permissions', () => {
    render(<UnixPermissions />);

    const octalInput = screen.getByLabelText(/Octal/i);
    expect(octalInput).toHaveValue('644');

    const symbolicInput = screen.getByLabelText(/Symbolic/i);
    expect(symbolicInput).toHaveValue('rw-r--r--');

    const ownerRead = checkbox('owner', /read/i);
    const ownerWrite = checkbox('owner', /write/i);
    const ownerExecute = checkbox('owner', /execute/i);

    expect(ownerRead).toBeChecked();
    expect(ownerWrite).toBeChecked();
    expect(ownerExecute).not.toBeChecked();
  });

  it('updates octal and symbolic when checkboxes change', () => {
    render(<UnixPermissions />);

    const ownerExecute = checkbox('owner', /execute/i);
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

    const groupExecute = checkbox('group', /execute/i);
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