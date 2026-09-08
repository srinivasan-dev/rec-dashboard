import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExceptionBreakdown } from './ExceptionBreakdown';

const EXCEPTIONS_BY_REASON = {
  MISSING_LEDGER: 0,
  MISSING_SETTLEMENT: 1,
  DUPLICATE_LEDGER: 0,
  AMOUNT_MISMATCH: 1,
  DATE_MISMATCH: 0,
  CURRENCY_MISMATCH: 0,
} as const;

describe('ExceptionBreakdown', () => {
  it('hides zero-count reasons and shows an "All" pill with the total', () => {
    render(
      <ExceptionBreakdown
        exceptionsByReason={EXCEPTIONS_BY_REASON}
        totalExceptionCount={2}
        selectedReason={undefined}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /^all/i })).toHaveTextContent('2');
    expect(screen.getByText(/no matching settlement/i)).toBeInTheDocument();
    expect(screen.getByText(/amount doesn't match/i)).toBeInTheDocument();
    expect(screen.queryByText(/not recorded in ledger/i)).not.toBeInTheDocument();
  });

  it('marks "All" pressed when no reason is selected, and the matching pill when one is', () => {
    render(
      <ExceptionBreakdown
        exceptionsByReason={EXCEPTIONS_BY_REASON}
        totalExceptionCount={2}
        selectedReason="AMOUNT_MISMATCH"
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /^all/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /amount doesn't match/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('calls onSelect with the reason when a pill is clicked, and undefined for "All"', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <ExceptionBreakdown
        exceptionsByReason={EXCEPTIONS_BY_REASON}
        totalExceptionCount={2}
        selectedReason={undefined}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /amount doesn't match/i }));
    expect(onSelect).toHaveBeenLastCalledWith('AMOUNT_MISMATCH');

    await user.click(screen.getByRole('button', { name: /^all/i }));
    expect(onSelect).toHaveBeenLastCalledWith(undefined);
  });
});
