import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FilterMenu } from './FilterMenu';

describe('FilterMenu', () => {
  it('is closed by default, and opens a reason select on click', async () => {
    const user = userEvent.setup();
    render(<FilterMenu reason={undefined} onChange={jest.fn()} />);

    expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /filter exceptions/i }));
    expect(screen.getByLabelText(/reason/i)).toHaveValue('');
  });

  it('reports the selected reason, and undefined for "All types"', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<FilterMenu reason="AMOUNT_MISMATCH" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /filter exceptions/i }));
    expect(screen.getByLabelText(/reason/i)).toHaveValue('AMOUNT_MISMATCH');

    await user.selectOptions(screen.getByLabelText(/reason/i), '');
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
