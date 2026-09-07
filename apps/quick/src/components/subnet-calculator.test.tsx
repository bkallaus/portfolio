import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubnetCalculator from './subnet-calculator';

describe('SubnetCalculator', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
      }
    });
  });

  it('renders the initial state correctly', () => {
    render(<SubnetCalculator />);

    // Check heading
    expect(screen.getByRole('heading', { name: /Subnet Calculator/i })).toBeInTheDocument();

    // Check input is default 192.168.1.0
    expect(screen.getByDisplayValue('192.168.1.0')).toBeInTheDocument();

    // Check calculation output for /24
    expect(screen.getByText('192.168.1.0')).toBeInTheDocument(); // Network Address
    expect(screen.getByText('255.255.255.0')).toBeInTheDocument(); // Subnet Mask
    expect(screen.getByText('254')).toBeInTheDocument(); // Hosts
    expect(screen.getByText('192.168.1.255')).toBeInTheDocument(); // Broadcast
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument(); // First
    expect(screen.getByText('192.168.1.254')).toBeInTheDocument(); // Last
  });

  it('handles invalid IP gracefully', () => {
    render(<SubnetCalculator />);

    const input = screen.getByLabelText(/IP Address/i);
    fireEvent.change(input, { target: { value: '999.999.999.999' } });

    expect(screen.getByText(/Invalid IP Address format/i)).toBeInTheDocument();
  });

  it('recalculates on slider / cidr change', () => {
    render(<SubnetCalculator />);

    // Find the number input for CIDR which defaults to 24
    const cidrInput = screen.getByRole('spinbutton');

    // Change to /30
    fireEvent.change(cidrInput, { target: { value: '30' } });

    // Should now show 2 hosts for a /30
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('255.255.255.252')).toBeInTheDocument(); // New mask
  });

  it('copies data to clipboard', () => {
    render(<SubnetCalculator />);

    const copyBtns = screen.getAllByRole('button', { name: /Copy Network Address/i });
    expect(copyBtns.length).toBeGreaterThan(0);

    fireEvent.click(copyBtns[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('192.168.1.0');
  });
});
