import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SortMenu } from './SortMenu';

describe('SortMenu', () => {
  it('shows the current sort field and order as checked, and reports changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<SortMenu sortBy="transactionDate" sortOrder="asc" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /sort exceptions/i }));

    expect(screen.getByRole('radio', { name: /^date$/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /ascending/i })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: /^reason$/i }));
    expect(onChange).toHaveBeenLastCalledWith({ sortBy: 'reason', sortOrder: 'asc' });

    await user.click(screen.getByRole('radio', { name: /descending/i }));
    expect(onChange).toHaveBeenLastCalledWith({ sortBy: 'transactionDate', sortOrder: 'desc' });
  });
});
