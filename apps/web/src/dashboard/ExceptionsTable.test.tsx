import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Pagination, SortBy, SortOrder } from '../api/types';
import { fetchExceptionById } from '../api/reconciliation';
import { store } from '../store/store';
import { allRowsCollapsed } from '../store/uiSlice';
import { AMOUNT_MISMATCH_EXCEPTION } from '../test/fixtures';
import { renderWithProviders } from '../test/renderWithProviders';
import { ExceptionsTable } from './ExceptionsTable';

jest.mock('../api/reconciliation', () => ({
  ...jest.requireActual('../api/reconciliation'),
  fetchExceptionById: jest.fn(),
}));

const mockedFetchExceptionById = jest.mocked(fetchExceptionById);

const EXCEPTION = AMOUNT_MISMATCH_EXCEPTION;

function renderTable(
  pagination?: Pagination,
  overrides: Partial<{ sortBy: SortBy; sortOrder: SortOrder }> = {},
) {
  const onSortChange = jest.fn();
  const onPageChange = jest.fn();

  renderWithProviders(
    <ExceptionsTable
      exceptions={[EXCEPTION]}
      sortBy={overrides.sortBy ?? 'transactionDate'}
      sortOrder={overrides.sortOrder ?? 'asc'}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={pagination ? onPageChange : undefined}
    />,
  );

  return { onSortChange, onPageChange };
}

describe('ExceptionsTable', () => {
  beforeEach(() => {
    mockedFetchExceptionById.mockResolvedValue(EXCEPTION);
    // renderWithProviders shares one real store across every test in this file (see that
    // helper's docstring) -- reset the expand state each test rather than letting whichever row
    // a previous test left expanded leak into the next one.
    store.dispatch(allRowsCollapsed());
  });

  it('renders the exception row with merchant-facing reason text, not the internal code', () => {
    renderTable({ page: 1, pageSize: 20, total: 1, totalPages: 1 });

    expect(screen.getByText("Amount doesn't match")).toBeInTheDocument();
    expect(screen.queryByText('AMOUNT_MISMATCH')).not.toBeInTheDocument();
  });

  it('calls onSortChange with the column when a sortable header button is clicked', async () => {
    const user = userEvent.setup();
    const { onSortChange } = renderTable({ page: 1, pageSize: 20, total: 1, totalPages: 1 });

    await user.click(screen.getByRole('button', { name: /reason/i }));

    expect(onSortChange).toHaveBeenCalledWith('reason');
  });

  it('marks the active sort column with aria-sort and leaves others "none"', () => {
    renderTable(
      { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      { sortBy: 'reason', sortOrder: 'desc' },
    );

    expect(screen.getByRole('columnheader', { name: /reason/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(screen.getByRole('columnheader', { name: /transaction/i })).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it('expands a row inline to show its exception detail when the row toggle is activated', async () => {
    const user = userEvent.setup();
    renderTable({ page: 1, pageSize: 20, total: 1, totalPages: 1 });

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', {
      name: /expand details for transaction t1013/i,
    });
    await user.click(toggle);

    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /collapse details for transaction t1013/i }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('supports independently expanding and collapsing a row via the same toggle', async () => {
    const user = userEvent.setup();
    renderTable({ page: 1, pageSize: 20, total: 1, totalPages: 1 });

    await user.click(screen.getByRole('button', { name: /expand details for transaction t1013/i }));
    await screen.findByRole('tablist');

    await user.click(
      screen.getByRole('button', { name: /collapse details for transaction t1013/i }),
    );

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('"Expand all" opens every row and "Collapse all" closes them', async () => {
    const user = userEvent.setup();
    renderTable({ page: 1, pageSize: 20, total: 1, totalPages: 1 });

    await user.click(screen.getByRole('button', { name: /^expand all$/i }));
    expect(await screen.findByRole('tablist')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^collapse all$/i }));
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('omits pagination controls when no pagination is supplied (search-results mode)', () => {
    renderTable(undefined);

    expect(
      screen.queryByRole('navigation', { name: /exceptions pagination/i }),
    ).not.toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    renderTable({ page: 1, pageSize: 20, total: 1, totalPages: 1 });

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('enables Next when there are more pages, and calls onPageChange with the next page', async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderTable({ page: 1, pageSize: 2, total: 5, totalPages: 3 });

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeEnabled();
    await user.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  describe('at tablet-portrait and below (useIsTabletOrBelow)', () => {
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
      // Simulates a tablet-portrait/mobile viewport so ExceptionsTable renders its
      // ExceptionCardList branch instead of the <table> -- see apps/web/src/hooks/useMediaQuery.ts.
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('renders a card list instead of a table', () => {
      renderTable({ page: 1, pageSize: 20, total: 1, totalPages: 1 });

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByRole('list', { name: /exceptions needing review/i })).toBeInTheDocument();
      expect(screen.getByText("Amount doesn't match")).toBeInTheDocument();
    });

    it('expands a card to show its detail, with a Close affordance', async () => {
      const user = userEvent.setup();
      renderTable({ page: 1, pageSize: 20, total: 1, totalPages: 1 });

      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: new RegExp(EXCEPTION.transactionId) }));
      expect(await screen.findByRole('tablist')).toBeInTheDocument();

      await user.click(
        screen.getByRole('button', {
          name: `Close details for transaction ${EXCEPTION.transactionId}`,
        }),
      );
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('still supports pagination in card mode', () => {
      renderTable({ page: 1, pageSize: 2, total: 5, totalPages: 3 });

      expect(
        screen.getByRole('navigation', { name: /exceptions pagination/i }),
      ).toBeInTheDocument();
    });
  });
});
