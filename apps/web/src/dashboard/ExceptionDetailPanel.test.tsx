import { screen, within } from '@testing-library/react';

import { fetchTransactionById, fetchExplanation } from '../api/reconciliation';
import { AMOUNT_MISMATCH_EXCEPTION, DUPLICATE_LEDGER_EXCEPTION } from '../test/fixtures';
import { renderWithProviders } from '../test/renderWithProviders';
import { ExceptionDetailPanel } from './ExceptionDetailPanel';

jest.mock('../api/reconciliation', () => ({
  ...jest.requireActual('../api/reconciliation'),
  fetchTransactionById: jest.fn(),
  fetchExplanation: jest.fn(),
}));

const mockedFetchTransactionById = jest.mocked(fetchTransactionById);
const mockedFetchExplanation = jest.mocked(fetchExplanation);

/**
 * Covers the current two-column, tab-free layout (ExceptionDetailPanel.tsx's own docstring: "not
 * the earlier Details/Settlement vs. Ledger/AI Explain tabs" -- everything a merchant needs is
 * visible at once, and the AI explanation is fetched unconditionally on mount, not gated behind
 * opening a tab). Previously (`ExceptionDrawer.test.tsx`, then an earlier version of this file)
 * this content lived behind three tabs a merchant had to click through; that UI no longer exists,
 * so this suite asserts everything is visible without any interaction, and that the explanation
 * fetch fires as soon as the panel mounts.
 */
describe('ExceptionDetailPanel', () => {
  it('shows the merchant-facing title, settlement/ledger detail, difference, and next step', async () => {
    mockedFetchTransactionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    mockedFetchExplanation.mockResolvedValue({
      explanationText: 'Explanation text.',
      generatedBy: 'mock',
    });
    const { container } = renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');
    expect(container).toHaveTextContent('USD 267.80');
    expect(container).toHaveTextContent('USD 243.49');
    expect(container).toHaveTextContent('USD 24.31');
    expect(container).toHaveTextContent(/differs from the amount in our ledger/i);
    expect(container).toHaveTextContent(/compare the settlement and ledger amounts/i);
  });

  it('shows both duplicate ledger entries so the merchant can verify them', async () => {
    mockedFetchTransactionById.mockResolvedValue(DUPLICATE_LEDGER_EXCEPTION);
    mockedFetchExplanation.mockResolvedValue({
      explanationText: 'Explanation text.',
      generatedBy: 'mock',
    });
    renderWithProviders(<ExceptionDetailPanel transactionId="T1008" />);

    expect(await screen.findByText('T1008')).toBeInTheDocument();
    const duplicateList = screen.getByRole('list', { name: /duplicate ledger entries/i });
    expect(within(duplicateList).getByText(/L7007/)).toBeInTheDocument();
    expect(within(duplicateList).getByText(/L7052/)).toBeInTheDocument();
  });

  it('shows the settlement vs. ledger side-by-side comparison without any extra interaction', async () => {
    mockedFetchTransactionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    mockedFetchExplanation.mockResolvedValue({
      explanationText: 'Explanation text.',
      generatedBy: 'mock',
    });
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');

    const panel = screen.getByText(/side-by-side comparison/i).closest('div');
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByText('S5013')).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByText('L7012')).toBeInTheDocument();
  });

  it('fetches the AI explanation as soon as the panel mounts, and shows it with a disclaimer', async () => {
    mockedFetchTransactionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    mockedFetchExplanation.mockResolvedValue({
      explanationText: 'The settlement and ledger amounts for this transaction do not match.',
      generatedBy: 'mock',
    });
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');

    expect(mockedFetchExplanation).toHaveBeenCalledWith('T1013');
    expect(
      await screen.findByText(/settlement and ledger amounts.*do not match/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/auto-generated — verify details/i)).toBeInTheDocument();
    expect(screen.getByText(/verify against your own records/i)).toBeInTheDocument();
  });

  it('does not claim "AI-generated" when the backend used its deterministic fallback', async () => {
    mockedFetchTransactionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    mockedFetchExplanation.mockResolvedValue({
      explanationText:
        'The settlement and ledger amounts for this transaction do not match. This needs review.',
      generatedBy: 'fallback',
    });
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');

    expect(await screen.findByText(/standard explanation/i)).toBeInTheDocument();
    expect(screen.queryByText(/auto-generated/i)).not.toBeInTheDocument();
  });

  it('shows a calm fallback if the explanation request fails, without hiding the deterministic detail', async () => {
    mockedFetchTransactionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    mockedFetchExplanation.mockRejectedValue(new Error('network down'));
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');

    expect(await screen.findByRole('alert')).toHaveTextContent(/details above are accurate/i);
    expect(screen.getByText('USD 24.31')).toBeInTheDocument();
  });

  it('shows a calm confirmation, not the exception layout, for a matched transaction', async () => {
    mockedFetchTransactionById.mockResolvedValue({
      ...AMOUNT_MISMATCH_EXCEPTION,
      reason: 'MATCHED',
    });
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    expect(await screen.findByText(/no action needed/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a retry affordance if the transaction detail itself fails to load', async () => {
    mockedFetchTransactionById.mockRejectedValue(new Error('network down'));
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /couldn't load this transaction's detail/i,
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
