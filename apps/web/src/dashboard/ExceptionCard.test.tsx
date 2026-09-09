import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { fetchTransactionById, fetchExplanation } from '../api/reconciliation';
import { AMOUNT_MISMATCH_EXCEPTION } from '../test/fixtures';
import { renderWithProviders } from '../test/renderWithProviders';
import { ExceptionCard } from './ExceptionCard';

jest.mock('../api/reconciliation', () => ({
  ...jest.requireActual('../api/reconciliation'),
  fetchTransactionById: jest.fn(),
  fetchExplanation: jest.fn(),
}));

const mockedFetchTransactionById = jest.mocked(fetchTransactionById);
const mockedFetchExplanation = jest.mocked(fetchExplanation);

const EXCEPTION = AMOUNT_MISMATCH_EXCEPTION;

describe('ExceptionCard', () => {
  beforeEach(() => {
    mockedFetchTransactionById.mockResolvedValue(EXCEPTION);
    mockedFetchExplanation.mockResolvedValue({
      explanationText: 'Explanation text.',
      generatedBy: 'mock',
    });
  });

  it('renders the transaction id, merchant-facing reason, date, and amount', () => {
    renderWithProviders(<ExceptionCard exception={EXCEPTION} />);

    expect(screen.getByText('T1013')).toBeInTheDocument();
    expect(screen.getByText("Amount doesn't match")).toBeInTheDocument();
  });

  it('tapping the card toggles the inline detail panel open, then closed via the Close button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExceptionCard exception={EXCEPTION} />);

    // ExceptionDetailPanel is a two-column, tab-free layout now (no `tablist`/`tab` roles) --
    // "Side-by-side comparison" is content that only renders once the panel is open.
    expect(screen.queryByText(/side-by-side comparison/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /t1013/i }));
    expect(await screen.findByText(/side-by-side comparison/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close details for transaction t1013/i }));
    expect(screen.queryByText(/side-by-side comparison/i)).not.toBeInTheDocument();
  });
});
