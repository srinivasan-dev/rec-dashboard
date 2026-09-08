import { memo, useCallback, useMemo, type ChangeEvent } from 'react';

import type { ExceptionsFilters, ExceptionReason, TransactionDto } from '../api/types';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { allRowsCollapsed, allRowsExpanded } from '../store/uiSlice';
import tableStyles from './ExceptionsTable.module.css';
import { ExportMenu } from './ExportMenu';
import { FilterMenu } from './FilterMenu';
import styles from './Toolbar.module.css';
import { TransactionIdSearchBox } from './TransactionIdSearchBox';

export interface ToolbarProps {
  filters: ExceptionsFilters;
  onChange: (patch: Partial<ExceptionsFilters>) => void;
  /** Drives "Expand all"'s disabled state and which ids it expands -- the currently-loaded page
   *  of exceptions (table or card layout, whichever ExceptionsTable.tsx is rendering). */
  exceptions: TransactionDto[];
  /** False while the table itself isn't actually showing (still loading, or errored) -- there's
   *  nothing loaded yet to export, so the button is hidden rather than left clickable. */
  showExport: boolean;
}

/**
 * The exceptions-table toolbar, merged into one row: "Expand all"/"Collapse all" on the left
 * (moved here from ExceptionsTable.tsx/ExceptionCardList.tsx, which both used to render their own
 * identical copy -- one shared instance now drives whichever layout is active, since expand state
 * lives in Redux either way), a transaction-id quick filter, then filter/export icon menus on the
 * right. The sort icon menu (SortMenu) was dropped from this row -- column-header sorting on the
 * table itself already covers the same "change sort" need without a second, redundant control.
 *
 * `memo`'d (like the widget charts) since it re-renders on every keystroke in
 * TransactionIdSearchBox's parent chain -- `useMemo`/`useCallback` below keep its own derived
 * values and the callbacks passed to children referentially stable so that memoization actually
 * has something to compare against instead of receiving a new object/function every time anyway.
 */
export const Toolbar = memo(function Toolbar({
  filters,
  onChange,
  exceptions,
  showExport,
}: ToolbarProps): JSX.Element {
  const dispatch = useAppDispatch();
  const expandedIds = useAppSelector((state) => state.ui.expandedTransactionIds);

  const allExpanded = useMemo(() => {
    if (exceptions.length === 0) return false;
    const expandedSet = new Set(expandedIds);
    return exceptions.every((e) => expandedSet.has(e.transactionId));
  }, [exceptions, expandedIds]);

  const expandAll = useCallback(() => {
    dispatch(allRowsExpanded(exceptions.map((e) => e.transactionId)));
  }, [dispatch, exceptions]);

  const collapseAll = useCallback(() => {
    dispatch(allRowsCollapsed());
  }, [dispatch]);

  const handleTransactionIdChange = useCallback(
    (transactionId: string | undefined) => onChange({ transactionId }),
    [onChange],
  );

  const handleReasonChange = useCallback(
    (reason: ExceptionReason | undefined) => onChange({ reason }),
    [onChange],
  );

  const handleShowMatchedChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange({ showMatched: event.target.checked }),
    [onChange],
  );

  // Not rendered here on mobile -- Dashboard.tsx mounts one copy of ExportMenu in the persistent
  // page header instead, per docs/product-spec.md §11 ("Export button remains accessible in the
  // page header"): this toolbar can end up scrolled out of view on a phone once the summary
  // cards and breakdown pills stack, but the header never does.
  const isMobile = useIsMobile();

  return (
    <div className={styles.toolbar} aria-label="Expand, filter, search, and export exceptions">
      <div className={tableStyles.tableActions}>
        <button
          type="button"
          className={tableStyles.tableActionButton}
          onClick={expandAll}
          disabled={exceptions.length === 0 || allExpanded}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 6.5 8 10l4-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Expand all
        </button>
        <button
          type="button"
          className={tableStyles.tableActionButton}
          onClick={collapseAll}
          disabled={expandedIds.length === 0}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 9.5 8 6l4 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Collapse all
        </button>

        <label className={styles.showMatchedLabel}>
          <input
            type="checkbox"
            checked={filters.showMatched ?? false}
            onChange={handleShowMatchedChange}
          />
          Show all transactions
        </label>
      </div>

      <div className={styles.iconGroup}>
        <TransactionIdSearchBox
          value={filters.transactionId}
          onChange={handleTransactionIdChange}
        />
        <FilterMenu reason={filters.reason} onChange={handleReasonChange} />
        {isMobile || !showExport ? null : <ExportMenu filters={filters} />}
      </div>
    </div>
  );
});
