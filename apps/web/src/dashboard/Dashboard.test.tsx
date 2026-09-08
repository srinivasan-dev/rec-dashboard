import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { fetchExceptionById, fetchExceptions, fetchSummary } from '../api/reconciliation';
import {
  ALL_CLEAR_SUMMARY,
  AMOUNT_MISMATCH_EXCEPTION,
  DUPLICATE_LEDGER_EXCEPTION,
  EXCEPTIONS_RESPONSE,
  POPULATED_SUMMARY,
} from '../test/fixtures';
import { renderWithProviders } from '../test/renderWithProviders';
import { store } from '../store/store';
import { allRowsCollapsed, searchCleared } from '../store/uiSlice';
import { Dashboard } from './Dashboard';

// buildExportUrl is pure (no network call) and stays real -- only the fetch functions mock.
jest.mock('../api/reconciliation', () => ({
  ...jest.requireActual('../api/reconciliation'),
  fetchSummary: jest.fn(),
  fetchExceptions: jest.fn(),
  fetchExceptionById: jest.fn(),
}));

const mockedFetchSummary = jest.mocked(fetchSummary);
const mockedFetchExceptions = jest.mocked(fetchExceptions);
const mockedFetchExceptionById = jest.mocked(fetchExceptionById);

describe('Dashboard', () => {
  beforeEach(() => {
    // renderWithProviders shares one real store across every test in this file -- reset the
    // expand/search UI state each test rather than letting a previous test's row-expand or
    // search-mode changes leak into the next one.
    store.dispatch(allRowsCollapsed());
    store.dispatch(searchCleared());
  });

  it('shows the loading state while the summary is in flight', () => {
    mockedFetchSummary.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/loading your reconciliation data/i)).toBeInTheDocument();
  });

  it('shows a merchant-friendly error with retry, and recovers when retry succeeds', async () => {
    mockedFetchSummary.mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /we couldn't load your reconciliation data/i,
    );
    // Never leak the raw error to the merchant.
    expect(screen.queryByText(/network down/i)).not.toBeInTheDocument();

    mockedFetchSummary.mockResolvedValueOnce(ALL_CLEAR_SUMMARY);
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText(/all 9 transactions reconciled/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the all-clear state as a positive confirmation, with no table', async () => {
    mockedFetchSummary.mockResolvedValue(ALL_CLEAR_SUMMARY);

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText(/all 9 transactions reconciled/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // Export stays available even when everything matches (docs/product-spec.md §8).
    expect(screen.getByRole('button', { name: /export exceptions/i })).toBeInTheDocument();
  });

  it('shows the populated state: status, breakdown, and the exceptions table', async () => {
    mockedFetchSummary.mockResolvedValue(POPULATED_SUMMARY);
    mockedFetchExceptions.mockResolvedValue(EXCEPTIONS_RESPONSE);

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText(/5 of 14 transactions need attention/i)).toBeInTheDocument();
    expect(screen.getByText(/amount doesn't match/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all/i, pressed: true })).toBeInTheDocument();
    // The exceptions query only enables once the summary confirms there's something to show
    // (see useReconciliationExceptions' `enabled` gate), so the table renders asynchronously.
    expect(await screen.findByRole('cell', { name: 'T1013' })).toBeInTheDocument();
  });

  it('shows a loading state scoped to the exceptions table, without blocking the rest of the page', async () => {
    mockedFetchSummary.mockResolvedValue(POPULATED_SUMMARY);
    mockedFetchExceptions.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Dashboard />);

    // The page shell (status, cards, breakdown) renders immediately once the summary resolves...
    expect(await screen.findByText(/5 of 14 transactions need attention/i)).toBeInTheDocument();
    // ...while the table region shows its own loading state, not the page-level one.
    expect(screen.getByText(/loading exceptions/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a scoped error with retry for the exceptions table, without affecting the rest of the page', async () => {
    mockedFetchSummary.mockResolvedValue(POPULATED_SUMMARY);
    mockedFetchExceptions.mockRejectedValueOnce(new Error('exceptions endpoint down'));
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);

    // Page shell still renders fine -- only the table region is in an error state.
    expect(await screen.findByText(/5 of 14 transactions need attention/i)).toBeInTheDocument();
    const tableAlert = await screen.findByRole('alert');
    expect(tableAlert).toHaveTextContent(/couldn't load the exceptions table/i);

    mockedFetchExceptions.mockResolvedValueOnce(EXCEPTIONS_RESPONSE);
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('expands a row inline to show its exception detail via a keyboard-operable row action', async () => {
    mockedFetchSummary.mockResolvedValue(POPULATED_SUMMARY);
    mockedFetchExceptions.mockResolvedValue(EXCEPTIONS_RESPONSE);
    mockedFetchExceptionById.mockResolvedValue(AMOUNT_MISMATCH_EXCEPTION);
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);

    const expandButton = await screen.findByRole('button', {
      name: /expand details for transaction t1013/i,
    });
    await user.click(expandButton);

    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    // "Amount doesn't match" also appears in the row's reason pill -- assert the inline panel
    // rendered rather than a single unique element.
    expect(screen.getAllByText("Amount doesn't match").length).toBeGreaterThan(1);
    expect(mockedFetchExceptionById).toHaveBeenCalledWith('T1013');
  });

  it('filtering by reason re-fetches and re-renders the table with the new data', async () => {
    mockedFetchSummary.mockResolvedValue(POPULATED_SUMMARY);
    mockedFetchExceptions.mockImplementation((filters) =>
      Promise.resolve(
        filters.reason === 'DUPLICATE_LEDGER'
          ? {
              data: [DUPLICATE_LEDGER_EXCEPTION],
              pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            }
          : EXCEPTIONS_RESPONSE,
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);
    await screen.findByRole('cell', { name: 'T1013' });

    await user.click(screen.getByRole('button', { name: /filter exceptions/i }));
    await user.selectOptions(screen.getByLabelText(/^reason$/i), 'DUPLICATE_LEDGER');

    // The table actually re-renders with the new filter's data, not just calls the mock.
    expect(await screen.findByRole('cell', { name: 'T1008' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'T1013' })).not.toBeInTheDocument();
    expect(mockedFetchExceptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: 'DUPLICATE_LEDGER' }),
    );
  });

  it('reflects the applied reason filter in the export link', async () => {
    mockedFetchSummary.mockResolvedValue(POPULATED_SUMMARY);
    mockedFetchExceptions.mockResolvedValue(EXCEPTIONS_RESPONSE);
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: /filter exceptions/i }));
    await user.selectOptions(screen.getByLabelText(/^reason$/i), 'AMOUNT_MISMATCH');
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /export exceptions/i }));
    await waitFor(() => {
      const exportLink = screen.getByRole('menuitem', { name: /export as csv/i });
      expect(exportLink).toHaveAttribute('href', expect.stringContaining('reason=AMOUNT_MISMATCH'));
    });
  });

  it('toggles sort direction on the same column and resets to ascending on a new column', async () => {
    mockedFetchSummary.mockResolvedValue(POPULATED_SUMMARY);
    mockedFetchExceptions.mockResolvedValue(EXCEPTIONS_RESPONSE);
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: /^date/i }));
    await waitFor(() =>
      expect(mockedFetchExceptions).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'transactionDate', sortOrder: 'desc' }),
      ),
    );

    await user.click(screen.getByRole('button', { name: /^reason/i }));
    await waitFor(() =>
      expect(mockedFetchExceptions).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'reason', sortOrder: 'asc' }),
      ),
    );
  });

  it('paginates by fetching the next page when Next is clicked', async () => {
    mockedFetchSummary.mockResolvedValue(POPULATED_SUMMARY);
    mockedFetchExceptions.mockResolvedValue({
      data: [AMOUNT_MISMATCH_EXCEPTION],
      pagination: { page: 1, pageSize: 1, total: 5, totalPages: 5 },
    });
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(mockedFetchExceptions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );
  });
});
