import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { fetchExceptionById } from '../api/reconciliation';
import { AMOUNT_MISMATCH_EXCEPTION } from '../test/fixtures';
import { renderWithProviders } from '../test/renderWithProviders';
import { ExceptionCard } from './ExceptionCard';

jest.mock('../api/reconciliation', () => ({
  ...jest.requireActual('../api/reconciliation'),
  fetchExceptionById: jest.fn(),
}));

const mockedFetchExceptionById = jest.mocked(fetchExceptionById);

const EXCEPTION = AMOUNT_MISMATCH_EXCEPTION;

describe('ExceptionCard', () => {
  beforeEach(() => {
    mockedFetchExceptionById.mockResolvedValue(EXCEPTION);
  });

  it('renders the transaction id, merchant-facing reason, date, and amount', () => {
    renderWithProviders(<ExceptionCard exception={EXCEPTION} />);

    expect(screen.getByText('T1013')).toBeInTheDocument();
    expect(screen.getByText("Amount doesn't match")).toBeInTheDocument();
  });

  it('tapping the card toggles the inline detail panel open, then closed via the Close button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExceptionCard exception={EXCEPTION} />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /t1013/i }));
    expect(await screen.findByRole('tablist')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close details for transaction t1013/i }));
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
