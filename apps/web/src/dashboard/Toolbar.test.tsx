import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ExceptionsFilters } from '../api/types';
import { store } from '../store/store';
import { allRowsCollapsed } from '../store/uiSlice';
import { AMOUNT_MISMATCH_EXCEPTION } from '../test/fixtures';
import { renderWithProviders } from '../test/renderWithProviders';
import { Toolbar } from './Toolbar';

const FILTERS: ExceptionsFilters = {
  page: 1,
  pageSize: 20,
  sortBy: 'transactionDate',
  sortOrder: 'asc',
};

const EXCEPTION = AMOUNT_MISMATCH_EXCEPTION;

function renderToolbar() {
  const onChange = jest.fn();
  renderWithProviders(
    <Toolbar filters={FILTERS} onChange={onChange} exceptions={[EXCEPTION]} showExport />,
  );
  return { onChange };
}

/**
 * "Expand all"/"Collapse all" moved here from ExceptionsTable.tsx/ExceptionCardList.tsx (one
 * shared instance drives whichever layout is active, via the same `expandedTransactionIds` Redux
 * state either component reads) -- see Toolbar.tsx's docstring. Both rows share one real store
 * (renderWithProviders), so expand state is reset between tests the same way
 * ExceptionsTable.test.tsx does.
 */
describe('Toolbar', () => {
  beforeEach(() => {
    store.dispatch(allRowsCollapsed());
  });

  it('"Expand all" is disabled with nothing expanded is false, and "Collapse all" starts disabled', () => {
    renderToolbar();

    expect(screen.getByRole('button', { name: /^expand all$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^collapse all$/i })).toBeDisabled();
  });

  it('"Expand all" expands every listed exception, and "Collapse all" then clears them', async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole('button', { name: /^expand all$/i }));

    expect(store.getState().ui.expandedTransactionIds).toEqual([EXCEPTION.transactionId]);
    expect(screen.getByRole('button', { name: /^expand all$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^collapse all$/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /^collapse all$/i }));

    expect(store.getState().ui.expandedTransactionIds).toEqual([]);
  });
});
