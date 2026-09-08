import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { fetchExceptionById, fetchExplanation } from '../api/reconciliation';
import { AMOUNT_MISMATCH_EXCEPTION, DUPLICATE_LEDGER_EXCEPTION } from '../test/fixtures';
import { renderWithProviders } from '../test/renderWithProviders';
import { ExceptionDetailPanel } from './ExceptionDetailPanel';

jest.mock('../api/reconciliation', () => ({
  ...jest.requireActual('../api/reconciliation'),
  fetchExceptionById: jest.fn(),
  fetchExplanation: jest.fn(),
}));

const mockedFetchExceptionById = jest.mocked(fetchExceptionById);
const mockedFetchExplanation = jest.mocked(fetchExplanation);

/**
 * Covers what `ExceptionDrawer.test.tsx` used to cover for the same content, before exception
 * detail moved from a drawer to an inline expandable row (docs/sessions/
 * 2026-09-08-epic17-search-and-inline-detail.md). Dialog semantics, the focus trap, and
 * open/close behavior are gone -- this renders in normal document flow now, exactly as
 * `ExceptionsTable.tsx` mounts it inside an expanded row -- so this only tests the tabs/content,
 * not any drawer chrome.
 */
describe('ExceptionDetailPanel', () => {
  it('shows the merchant-facing title, settlement/ledger detail, difference, and next step', async () => {
    mockedFetchExceptionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    const { container } = renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');
    // Both amount figures also appear in the (hidden-but-rendered) comparison tabpanel, so this
    // checks the panel's full text content rather than asserting a single unique element.
    expect(container).toHaveTextContent('USD 267.80');
    expect(container).toHaveTextContent('USD 243.49');
    expect(container).toHaveTextContent('USD 24.31');
    expect(container).toHaveTextContent(/differs from the amount in our ledger/i);
    expect(container).toHaveTextContent(/compare the settlement and ledger amounts/i);
  });

  it('shows both duplicate ledger entries so the merchant can verify them', async () => {
    mockedFetchExceptionById.mockResolvedValue(DUPLICATE_LEDGER_EXCEPTION);
    renderWithProviders(<ExceptionDetailPanel transactionId="T1008" />);

    expect(await screen.findByText('T1008')).toBeInTheDocument();
    const duplicateList = screen.getByRole('list', { name: /duplicate ledger entries/i });
    expect(within(duplicateList).getByText(/L7007/)).toBeInTheDocument();
    expect(within(duplicateList).getByText(/L7052/)).toBeInTheDocument();
  });

  it('opens on the Details tab, with Settlement vs. Ledger and AI Explain inactive', async () => {
    mockedFetchExceptionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');

    expect(screen.getByRole('tab', { name: /^details$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /settlement vs\. ledger/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: /ai explain/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('switches to the Settlement vs. Ledger tab and shows the side-by-side comparison', async () => {
    mockedFetchExceptionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    const user = userEvent.setup();
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');
    await user.click(screen.getByRole('tab', { name: /settlement vs\. ledger/i }));

    const panel = screen.getByRole('tabpanel', { name: /settlement vs\. ledger/i });
    expect(panel).toBeVisible();
    expect(within(panel).getByText('S5013')).toBeInTheDocument();
    expect(within(panel).getByText('L7012')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^details$/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('fetches the explanation only once the AI Explain tab is opened, and shows it with a disclaimer', async () => {
    mockedFetchExceptionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    mockedFetchExplanation.mockResolvedValue({
      explanationText: 'The settlement and ledger amounts for this transaction do not match.',
      generatedBy: 'mock',
    });
    const user = userEvent.setup();
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');
    expect(mockedFetchExplanation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /ai explain/i }));

    expect(mockedFetchExplanation).toHaveBeenCalledWith('T1013');
    expect(
      await screen.findByText(/settlement and ledger amounts.*do not match/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/auto-generated — verify details/i)).toBeInTheDocument();
    expect(screen.getByText(/verify against your own records/i)).toBeInTheDocument();
  });

  it('does not claim "AI-generated" when the backend used its deterministic fallback', async () => {
    mockedFetchExceptionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    mockedFetchExplanation.mockResolvedValue({
      explanationText:
        'The settlement and ledger amounts for this transaction do not match. This needs review.',
      generatedBy: 'fallback',
    });
    const user = userEvent.setup();
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');
    await user.click(screen.getByRole('tab', { name: /ai explain/i }));

    expect(await screen.findByText(/standard explanation/i)).toBeInTheDocument();
    expect(screen.queryByText(/auto-generated/i)).not.toBeInTheDocument();
  });

  it('shows a calm fallback if the explanation request fails, without hiding the deterministic detail', async () => {
    mockedFetchExceptionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    mockedFetchExplanation.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    renderWithProviders(<ExceptionDetailPanel transactionId="T1013" />);

    await screen.findByText('T1013');
    await user.click(screen.getByRole('tab', { name: /ai explain/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/details above are accurate/i);

    await user.click(screen.getByRole('tab', { name: /^details$/i }));
    expect(screen.getByRole('tabpanel', { name: /^details$/i })).toHaveTextContent('USD 24.31');
  });
});
