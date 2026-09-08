import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Client-only UI state that belongs in neither TanStack Query (server state) nor the URL
 * (shareable/bookmarkable state — see docs/product-spec.md §7 and §17 criterion 4, which commit
 * filters/sort/pagination to URL search params). This slice is intentionally narrow: transient
 * UI concerns only. See docs/standards/frontend-standards.md "State management boundaries" for
 * what does and does not belong here.
 *
 * `expandedTransactionIds` and `search` replaced the earlier single `selectedExceptionId`
 * (drawer-based exception detail) once exception detail moved inline into the table and the
 * drawer was repurposed for global search results (see
 * docs/sessions/2026-09-08-epic17-search-and-inline-detail.md).
 */
export interface UiState {
  /** Which rows currently show their inline exception-detail panel expanded. */
  expandedTransactionIds: string[];
  search: SearchState;
  toasts: Toast[];
  /** Whether AppShell's left nav is in its slim, icons-only state. Lives here (not local
   *  component state) because AppShell itself remounts on every route change (App.tsx wraps each
   *  <Route>'s element in its own <AppShell>), so a useState here would forget the preference the
   *  moment a merchant clicked to a different page. */
  sidebarCollapsed: boolean;
  /** Whether the mobile off-canvas nav drawer is open (<=599px only -- desktop/tablet ignore
   *  this and always show the rail). Lives here for the same remount reason as
   *  `sidebarCollapsed` above, and because it must close itself on route change from AppShell. */
  mobileNavOpen: boolean;
}

export interface SearchState {
  /** The last submitted query (Enter/search-button, not live-as-you-type), or null when idle --
   *  drives the table's search-mode filtering, always the most recent entry of `history`. */
  query: string | null;
  /** Every query submitted this session, oldest first -- the chat panel renders one turn per
   *  entry (each turn fetches its own matches/summary by query text, so history only needs to
   *  remember *what* was asked, not the results). */
  history: string[];
  /** Whether the chat panel (30% split) is open. Independent of `query`/`history` so closing it
   *  doesn't forget the conversation -- reopening it (e.g. from the "N results" bar) shows the
   *  same chat without re-searching. */
  drawerOpen: boolean;
  /** A suggested-prompt chip's text, waiting to be picked up by GlobalSearchBar and dropped into
   *  its (locally-owned, per-keystroke) draft input -- set by SuggestedPrompts, consumed and
   *  cleared by GlobalSearchBar. Deliberately doesn't submit the search itself: picking a
   *  suggestion should behave like typing it, leaving the merchant to press search/Enter, not
   *  fire a query on their behalf. */
  pendingDraft: string | null;
}

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

const initialState: UiState = {
  expandedTransactionIds: [],
  search: { query: null, history: [], drawerOpen: false, pendingDraft: null },
  toasts: [],
  sidebarCollapsed: true,
  mobileNavOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    rowExpandToggled(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.expandedTransactionIds = state.expandedTransactionIds.includes(id)
        ? state.expandedTransactionIds.filter((existing) => existing !== id)
        : [...state.expandedTransactionIds, id];
    },
    /** Idempotent expand, unlike the toggle above -- used when jumping to a row from search
     *  results, where "expand it" should never accidentally collapse an already-open row. */
    rowExpanded(state, action: PayloadAction<string>) {
      if (!state.expandedTransactionIds.includes(action.payload)) {
        state.expandedTransactionIds.push(action.payload);
      }
    },
    allRowsExpanded(state, action: PayloadAction<string[]>) {
      state.expandedTransactionIds = action.payload;
    },
    allRowsCollapsed(state) {
      state.expandedTransactionIds = [];
    },
    /** A new chat turn -- appended to history (even if it repeats an earlier query, same as
     *  asking a chatbot the same question twice) and made the active query driving the table's
     *  search-mode filtering. If the panel was closed, this reopens it as a fresh conversation --
     *  previous turns are discarded rather than resumed, so reopening the chat always starts
     *  clean instead of surfacing a stale transcript from earlier in the session. */
    searchSubmitted(state, action: PayloadAction<string>) {
      if (!state.search.drawerOpen) {
        state.search.history = [];
      }
      state.search.history.push(action.payload);
      state.search.query = action.payload;
      state.search.drawerOpen = true;
    },
    searchDrawerOpened(state) {
      if (state.search.query) state.search.drawerOpen = true;
    },
    searchDrawerClosed(state) {
      state.search.drawerOpen = false;
    },
    searchCleared(state) {
      state.search = { query: null, history: [], drawerOpen: false, pendingDraft: null };
    },
    /** SuggestedPrompts picked a chip -- fills the search bar's draft, doesn't submit it (the
     *  merchant still has to press search/Enter themselves). */
    searchDraftPrefilled(state, action: PayloadAction<string>) {
      state.search.pendingDraft = action.payload;
    },
    /** GlobalSearchBar has copied `pendingDraft` into its own local input state -- clears it so
     *  the same prefill doesn't reapply (e.g. after the merchant clears the field by hand). */
    searchDraftConsumed(state) {
      state.search.pendingDraft = null;
    },
    toastShown(state, action: PayloadAction<Toast>) {
      state.toasts.push(action.payload);
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    mobileNavOpened(state) {
      state.mobileNavOpen = true;
    },
    mobileNavClosed(state) {
      state.mobileNavOpen = false;
    },
  },
});

export const {
  rowExpandToggled,
  rowExpanded,
  allRowsExpanded,
  allRowsCollapsed,
  searchSubmitted,
  searchDrawerOpened,
  searchDrawerClosed,
  searchCleared,
  searchDraftPrefilled,
  searchDraftConsumed,
  toastShown,
  toastDismissed,
  sidebarToggled,
  mobileNavOpened,
  mobileNavClosed,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
