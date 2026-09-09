import { useCallback, useMemo } from 'react';

import type { SortBy } from '../api/types';
import { useExceptionsFilters } from '../hooks/useExceptionsFilters';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useReconciliationExceptions } from '../hooks/useReconciliationExceptions';
import { useReconciliationSummary } from '../hooks/useReconciliationSummary';
import { useReconciliationTransactions } from '../hooks/useReconciliationTransactions';
import { useAppSelector } from '../store/hooks';
import buttons from '../styles/buttons.module.css';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import styles from './Dashboard.module.css';
import { ExceptionsTable } from './ExceptionsTable';
import { ExceptionsByReasonChart } from './ExceptionsByReasonChart';
import { ExportMenu } from './ExportMenu';
import { FinancialImpactBarChart } from './FinancialImpactBarChart';
import { ReconciliationPieChart } from './ReconciliationPieChart';
import { SearchChatPanel } from './SearchChatPanel';
import { SearchHero } from './SearchHero';
// import { SummaryCards } from './SummaryCards'; -- temporarily swapped for the D3 widget row
// (ReconciliationPieChart / FinancialImpactBarChart / ExceptionsByReasonChart) below; remove this
// comment and the import above once decided.
import { Toolbar } from './Toolbar';
import toolbarStyles from './Toolbar.module.css';

/**
 * Composes the four UX states from docs/product-spec.md §8. The summary query drives the
 * page-level state (loading/error/all-clear/populated); once summary has loaded and there are
 * exceptions to show, the exceptions-list query drives its own loading/error/populated state
 * for just the table region, independent of the page shell. This split means a filter change
 * only re-renders the table's own loading state, not the whole page.
 *
 * A submitted global search (SearchHero's GlobalSearchBar, or a SuggestedPrompts chip) and the
 * AI chat drawer (SearchChatPanel) run entirely on their own query (`useExceptionsSearch`) --
 * this main table always shows `useReconciliationExceptions`'s filter-driven results from the
 * API, regardless of what's been searched or discussed in the chat. The two surfaces intentionally
 * never share state: searching or chatting must never change what the table displays.
 */
export function Dashboard(): JSX.Element {
  const [filters, updateFilters] = useExceptionsFilters();
  // The date-range picker lives in SearchHero (right of the status banner) now, but its from/to
  // are still just `filters.from`/`filters.to` -- one URL-persisted range shared by the summary
  // (and, through it, every chart widget below), the currency-totals widget, and the table.
  // Memoized so `useReconciliationSummary`/`useCurrencyTotals`/DateRangePicker see the same object
  // reference across renders that don't actually change from/to, not a new literal every time.
  const dateRange = useMemo(
    () => ({ from: filters.from, to: filters.to }),
    [filters.from, filters.to],
  );
  const summaryQuery = useReconciliationSummary(dateRange);

  const hasExceptions = (summaryQuery.data?.exceptionCount ?? 0) > 0;
  const hasMatched = (summaryQuery.data?.matchedCount ?? 0) > 0;
  // Toolbar.tsx's "Show matched transactions" checkbox -- unchecked (default) is today's
  // exceptions-only table; checked additionally includes every matched transaction, via a
  // separate endpoint/query (GET /transactions) rather than widening GET /exceptions, so the
  // default path's query shape and caching are unaffected by this feature.
  const showMatched = filters.showMatched ?? false;
  // The table section renders whenever there's something for the *current* toggle to show --
  // with matched transactions included, an account with zero exceptions but real matched
  // transactions should still get a table, not the all-clear state.
  const showTableSection = hasExceptions || (showMatched && hasMatched);
  const exceptionsQuery = useReconciliationExceptions(filters, showTableSection && !showMatched);
  const transactionsQuery = useReconciliationTransactions(filters, showTableSection && showMatched);
  const tableQuery = showMatched ? transactionsQuery : exceptionsQuery;
  // `isFetching` covers a background refetch of an already-cached filter combination (e.g.
  // clearing the transaction-id search back to one seen earlier), not just a first-time fetch --
  // see the table section's own comment below for why that distinction matters here.
  const isTableBusy = tableQuery.isLoading || tableQuery.isFetching;
  const chatOpen = useAppSelector((state) => state.ui.search.drawerOpen);
  const isMobile = useIsMobile();

  const handleRefresh = useCallback(() => {
    void summaryQuery.refetch();
    void tableQuery.refetch();
  }, [summaryQuery, tableQuery]);

  // Toggles sort direction when the same column is clicked again, otherwise starts ascending on
  // the new one.
  const handleSortChange = useCallback(
    (sortBy: SortBy) => {
      updateFilters({
        sortBy,
        sortOrder: filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc',
      });
    },
    [updateFilters, filters.sortBy, filters.sortOrder],
  );

  const handlePageChange = useCallback((page: number) => updateFilters({ page }), [updateFilters]);
  const handlePageSizeChange = useCallback(
    (pageSize: number) => updateFilters({ pageSize }),
    [updateFilters],
  );

  return (
    <div className={styles.splitLayout}>
      <main
        className={`${styles.page} ${chatOpen ? styles.pageCompact : styles.pageScrollbarHidden}`}
      >
        {/* Mobile only (Dashboard.module.css) -- docs/product-spec.md §11 calls out that export
            stays reachable near the top of the page, since the toolbar/all-clear section below
            can scroll out of view once summary cards and breakdown pills stack on a phone. Hidden
            everywhere else, where Toolbar already shows its own copy. Only shown once the table
            itself is actually visible -- there's nothing to export while it's loading or errored. */}
        {isMobile && showTableSection && tableQuery.data ? (
          <div className={styles.mobileExportRow}>
            <ExportMenu filters={filters} />
          </div>
        ) : null}

        {/* All-clear state (any viewport): neither Toolbar nor the mobile row above renders
            (both are gated on `showTableSection`, which is false here), so without this, export
            would be entirely unreachable once every transaction reconciles -- directly
            contradicting docs/product-spec.md §8's "Export (for record-keeping even when
            everything matches)" and §11's "Export button remains accessible" commitments. Reuses
            the same row styling as the mobile-only one above; it isn't actually mobile-specific,
            just named for its original use. */}
        {summaryQuery.data && !showTableSection ? (
          <div className={styles.mobileExportRow}>
            <ExportMenu filters={filters} />
          </div>
        ) : null}

        {summaryQuery.isLoading ? (
          <div className={styles.section} aria-live="polite">
            <p className={styles.infoBanner}>
              <span aria-hidden="true">ⓘ</span> Loading your reconciliation data...
            </p>
            <div className={styles.skeletonRow}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div className={styles.skeletonCard} key={i}>
                  <span className={styles.skeletonLabel} />
                  <span className={styles.skeletonValue} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {summaryQuery.isError ? (
          <div className={styles.errorState} role="alert">
            <span className={styles.errorIcon} aria-hidden="true">
              !
            </span>
            <p className={styles.errorTitle}>Unable to load reconciliation data</p>
            <p className={styles.errorMessage}>
              We couldn&apos;t load your reconciliation data right now. Your data is safe — this is
              a temporary issue on our end.
            </p>
            <div className={styles.errorActions}>
              <button
                type="button"
                className={buttons.primary}
                onClick={() => summaryQuery.refetch()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {summaryQuery.data ? (
          <>
            <h2 className="visually-hidden">Summary</h2>
            <SearchHero
              summary={summaryQuery.data}
              filters={filters}
              onFiltersChange={updateFilters}
              onRefresh={handleRefresh}
              isRefreshing={summaryQuery.isFetching || tableQuery.isFetching}
            />
            <div className={styles.widgetsRow}>
              <ChartErrorBoundary label="Matched vs. exceptions">
                <ReconciliationPieChart summary={summaryQuery.data} />
              </ChartErrorBoundary>
              <ChartErrorBoundary label="Financial impact by currency">
                <FinancialImpactBarChart dateRange={dateRange} summary={summaryQuery.data} />
              </ChartErrorBoundary>
              <ChartErrorBoundary label="Exceptions by reason">
                <ExceptionsByReasonChart summary={summaryQuery.data} />
              </ChartErrorBoundary>
            </div>

            {showTableSection ? (
              <div className={styles.section}>
                {/* ExceptionBreakdown (the "All / reason" filter pill row -- also a reason-filter
                    shortcut for Toolbar's own filter) is hidden for now; ExceptionsByReasonChart
                    in the widget row above already shows this breakdown visually. Reason filtering
                    itself still works via Toolbar's FilterMenu. */}

                <Toolbar
                  filters={filters}
                  onChange={updateFilters}
                  exceptions={tableQuery.data?.data ?? []}
                  showExport={!!tableQuery.data}
                />

                {/* `isFetching` (not just `isLoading`) so the loader also covers a background
                    refetch of an already-cached filter combination -- e.g. clearing the
                    transaction-id search back to a filter seen earlier in this session, which
                    TanStack Query serves from cache instantly (`isLoading` false) while quietly
                    revalidating in the background. Without this, that specific transition swapped
                    straight to the (possibly stale) cached rows with no loading feedback at all,
                    while every *new* filter value correctly showed the skeleton below. Gating the
                    error/data blocks on `!isTableBusy` too keeps exactly one of skeleton/error/
                    table visible at a time instead of two overlapping mid-transition. */}
                {isTableBusy ? (
                  <div className={styles.skeletonTable} aria-live="polite">
                    <p className={styles.infoBanner}>
                      <span aria-hidden="true">ⓘ</span> Loading exceptions...
                    </p>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div className={styles.skeletonTableRow} key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <span className={styles.skeletonCell} key={j} />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}

                {!isTableBusy && tableQuery.isError ? (
                  <div className={styles.tableError} role="alert">
                    <p>We couldn&apos;t load the exceptions table right now.</p>
                    <button
                      type="button"
                      className={buttons.secondary}
                      onClick={() => tableQuery.refetch()}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}

                {!isTableBusy && tableQuery.data ? (
                  <ExceptionsTable
                    exceptions={tableQuery.data.data}
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    pagination={tableQuery.data.pagination}
                    onSortChange={handleSortChange}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                ) : null}
              </div>
            ) : hasMatched ? (
              // All-clear state has no table to export, so no export button here -- just the
              // "show matched transactions" checkbox (left-aligned, matching Toolbar.tsx's own
              // placement), so a merchant with zero exceptions but real matched transactions can
              // still reach it, since Toolbar itself only renders once `showTableSection` is true.
              <div className={styles.tableToolbar}>
                <label className={toolbarStyles.showMatchedLabel}>
                  <input
                    type="checkbox"
                    checked={showMatched}
                    onChange={(event) => updateFilters({ showMatched: event.target.checked })}
                  />
                  Show all transactions
                </label>
              </div>
            ) : null}
          </>
        ) : null}
      </main>
      <SearchChatPanel />
    </div>
  );
}
