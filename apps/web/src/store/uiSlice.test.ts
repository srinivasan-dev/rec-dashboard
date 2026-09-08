import {
  allRowsCollapsed,
  allRowsExpanded,
  rowExpandToggled,
  rowExpanded,
  searchCleared,
  searchDrawerClosed,
  searchDrawerOpened,
  searchSubmitted,
  sidebarToggled,
  toastDismissed,
  toastShown,
  uiReducer,
  type UiState,
} from './uiSlice';

const initialState: UiState = {
  expandedTransactionIds: [],
  search: { query: null, history: [], drawerOpen: false },
  toasts: [],
  sidebarCollapsed: false,
};

describe('uiSlice', () => {
  describe('row expand/collapse', () => {
    it('toggles a row open, then closed', () => {
      const opened = uiReducer(initialState, rowExpandToggled('T1013'));
      expect(opened.expandedTransactionIds).toEqual(['T1013']);

      const closed = uiReducer(opened, rowExpandToggled('T1013'));
      expect(closed.expandedTransactionIds).toEqual([]);
    });

    it('supports multiple rows open independently', () => {
      const first = uiReducer(initialState, rowExpandToggled('T1013'));
      const both = uiReducer(first, rowExpandToggled('T1006'));
      expect(both.expandedTransactionIds).toEqual(['T1013', 'T1006']);
    });

    it('rowExpanded is idempotent -- expanding an already-open row changes nothing', () => {
      const opened = uiReducer(initialState, rowExpanded('T1013'));
      const openedAgain = uiReducer(opened, rowExpanded('T1013'));
      expect(openedAgain.expandedTransactionIds).toEqual(['T1013']);
    });

    it('allRowsExpanded/allRowsCollapsed set and clear the whole list', () => {
      const expanded = uiReducer(initialState, allRowsExpanded(['T1013', 'T1006']));
      expect(expanded.expandedTransactionIds).toEqual(['T1013', 'T1006']);

      const collapsed = uiReducer(expanded, allRowsCollapsed());
      expect(collapsed.expandedTransactionIds).toEqual([]);
    });
  });

  describe('search', () => {
    it('submitting a query appends to history, sets it active, and opens the chat panel', () => {
      const state = uiReducer(initialState, searchSubmitted('duplicate'));

      expect(state.search).toEqual({
        query: 'duplicate',
        history: ['duplicate'],
        drawerOpen: true,
      });
    });

    it('a second query appends to history rather than replacing it', () => {
      const first = uiReducer(initialState, searchSubmitted('duplicate'));
      const second = uiReducer(first, searchSubmitted('amount mismatch'));

      expect(second.search.history).toEqual(['duplicate', 'amount mismatch']);
      expect(second.search.query).toBe('amount mismatch');
    });

    it('closing the panel keeps the query and history', () => {
      const submitted = uiReducer(initialState, searchSubmitted('duplicate'));
      const closed = uiReducer(submitted, searchDrawerClosed());

      expect(closed.search.drawerOpen).toBe(false);
      expect(closed.search.query).toBe('duplicate');
      expect(closed.search.history).toEqual(['duplicate']);
    });

    it('reopening the panel does nothing without an active query', () => {
      const reopened = uiReducer(initialState, searchDrawerOpened());
      expect(reopened.search.drawerOpen).toBe(false);
    });

    it('reopening the panel works once there is an active query', () => {
      const submitted = uiReducer(initialState, searchSubmitted('duplicate'));
      const closed = uiReducer(submitted, searchDrawerClosed());
      const reopened = uiReducer(closed, searchDrawerOpened());

      expect(reopened.search.drawerOpen).toBe(true);
    });

    it('clearing search resets query, history, and closes the panel', () => {
      const submitted = uiReducer(initialState, searchSubmitted('duplicate'));
      const cleared = uiReducer(submitted, searchCleared());

      expect(cleared.search).toEqual({ query: null, history: [], drawerOpen: false });
    });
  });

  describe('sidebar', () => {
    it('toggles collapsed state', () => {
      const collapsed = uiReducer(initialState, sidebarToggled());
      expect(collapsed.sidebarCollapsed).toBe(true);

      const expanded = uiReducer(collapsed, sidebarToggled());
      expect(expanded.sidebarCollapsed).toBe(false);
    });
  });

  describe('toasts', () => {
    it('adds and removes toasts by id', () => {
      const withToast = uiReducer(
        initialState,
        toastShown({ id: 'toast-1', message: 'Export started', tone: 'info' }),
      );
      expect(withToast.toasts).toHaveLength(1);

      const dismissed = uiReducer(withToast, toastDismissed('toast-1'));
      expect(dismissed.toasts).toHaveLength(0);
    });
  });
});
