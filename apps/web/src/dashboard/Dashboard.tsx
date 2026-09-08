import { useExceptionsFilters } from '../hooks/useExceptionsFilters';
import { useExceptionsSearch } from '../hooks/useExceptionsSearch';
import { useReconciliationExceptions } from '../hooks/useReconciliationExceptions';
import { useReconciliationSummary } from '../hooks/useReconciliationSummary';
import { GlobalSearchBar } from '../layout/GlobalSearchBar';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { searchCleared } from '../store/uiSlice';
import buttons from '../styles/buttons.module.css';
import styles from './Dashboard.module.css';
import { ExceptionBreakdown } from './ExceptionBreakdown';
import { ExceptionsTable } from './ExceptionsTable';
import { ExportMenu } from './ExportMenu';
import { SearchChatPanel } from './SearchChatPanel';
import { StatusBanner } from './StatusBanner';
import { SummaryCards } from './SummaryCards';
import { Toolbar } from './Toolbar';

/**
 * Composes the four UX states from docs/product-spec.md §8. The summary query drives the
 * page-level state (loading/error/all-clear/populated); once summary has loaded and there are
 * exceptions to show, the exceptions-list query drives its own loading/error/populated state
 * for just the table region, independent of the page shell. This split means a filter change
 * only re-renders the table's own loading state, not the whole page.
 *
 * A submitted global search (AppShell's GlobalSearchBar) takes over the exceptions region
 * entirely -- see docs/sessions/2026-09-08-epic17-search-and-inline-detail.md. Search results
 * come from one query (`useExceptionsSearch`) shared with the search drawer, so the table and the
 * drawer can never show different results for the same query.
 */
export function Dashboard(): JSX.Element {
  const [filters, updateFilters] = useExceptionsFilters();
  const summaryQuery = useReconciliationSummary();
  const dispatch = useAppDispatch();
  const searchQuery = useAppSelector((state) => state.ui.search.query);

  const hasExceptions = (summaryQuery.data?.exceptionCount ?? 0) > 0;
  const exceptionsQuery = useReconciliationExceptions(filters, hasExceptions && !searchQuery);
  const searchResultsQuery = useExceptionsSearch(searchQuery);
  const chatOpen = useAppSelector((state) => state.ui.search.drawerOpen);

  function handleRefresh(): void {
    void summaryQuery.refetch();
    void exceptionsQuery.refetch();
  }

  return (
    <div className={styles.splitLayout}>
      <main className={`${styles.page} ${chatOpen ? styles.pageCompact : ''}`}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Settlement Reconciliation</h1>
            {summaryQuery.data ? (
              <p className={styles.subtitle}>Merchant {summaryQuery.data.merchantId}</p>
            ) : null}
          </div>
          <div className={styles.headerSearch}>
            <GlobalSearchBar />
          </div>
        </header>

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
            <StatusBanner
              totalChecked={summaryQuery.data.totalChecked}
              matchedCount={summaryQuery.data.matchedCount}
              exceptionCount={summaryQuery.data.exceptionCount}
            />
            <SummaryCards summary={summaryQuery.data} />

            {searchQuery ? (
              <div className={styles.section}>
                <div className={styles.searchModeBar}>
                  {searchResultsQuery.data ? (
                    <p className={styles.searchModeSummary}>
                      {searchResultsQuery.data.matchType === 'intent' ? (
                        <>
                          No exact match for &ldquo;{searchQuery}&rdquo; — showing all{' '}
                          {searchResultsQuery.data.data.length} exceptions (see the AI summary for
                          what&apos;s likely relevant)
                        </>
                      ) : (
                        <>
                          {searchResultsQuery.data.data.length}{' '}
                          {searchResultsQuery.data.data.length === 1 ? 'result' : 'results'} for
                          &ldquo;{searchQuery}&rdquo;
                        </>
                      )}
                    </p>
                  ) : (
                    <p className={styles.searchModeSummary} aria-live="polite">
                      Searching for &ldquo;{searchQuery}&rdquo;...
                    </p>
                  )}
                  <button
                    type="button"
                    className={buttons.secondary}
                    onClick={() => dispatch(searchCleared())}
                  >
                    Clear search
                  </button>
                </div>

                {searchResultsQuery.isError ? (
                  <div className={styles.tableError} role="alert">
                    <p>We couldn&apos;t search your exceptions right now.</p>
                    <button
                      type="button"
                      className={buttons.secondary}
                      onClick={() => searchResultsQuery.refetch()}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}

                {searchResultsQuery.data ? (
                  <ExceptionsTable
                    exceptions={searchResultsQuery.data.data}
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSortChange={(sortBy) =>
                      updateFilters({
                        sortBy,
                        sortOrder:
                          filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc',
                      })
                    }
                    // Only highlight for a real keyword match -- in 'intent' mode nothing in the
                    // (unfiltered) rows actually contains the query text, so highlighting would
                    // either do nothing or, worse, coincidentally highlight an unrelated substring.
                    searchQuery={
                      searchResultsQuery.data.matchType === 'literal' ? searchQuery : null
                    }
                  />
                ) : null}
              </div>
            ) : hasExceptions ? (
              <div className={styles.section}>
                <ExceptionBreakdown
                  exceptionsByReason={summaryQuery.data.exceptionsByReason}
                  totalExceptionCount={summaryQuery.data.exceptionCount}
                  selectedReason={filters.reason}
                  onSelect={(reason) => updateFilters({ reason })}
                />

                <Toolbar
                  filters={filters}
                  onChange={updateFilters}
                  onRefresh={handleRefresh}
                  isRefreshing={summaryQuery.isFetching || exceptionsQuery.isFetching}
                />

                {exceptionsQuery.isLoading ? (
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

                {exceptionsQuery.isError ? (
                  <div className={styles.tableError} role="alert">
                    <p>We couldn&apos;t load the exceptions table right now.</p>
                    <button
                      type="button"
                      className={buttons.secondary}
                      onClick={() => exceptionsQuery.refetch()}
                    >
                      Retry
                    </button>
                  </div>
                ) : null}

                {exceptionsQuery.data ? (
                  <ExceptionsTable
                    exceptions={exceptionsQuery.data.data}
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    pagination={exceptionsQuery.data.pagination}
                    onSortChange={(sortBy) =>
                      updateFilters({
                        sortBy,
                        sortOrder:
                          filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc',
                      })
                    }
                    onPageChange={(page) => updateFilters({ page })}
                  />
                ) : null}
              </div>
            ) : (
              // All-clear state has no table (and no reason/sort to offer), but export must stay
              // available for record-keeping (docs/product-spec.md §8) -- keep it right-aligned in
              // the same spot the table toolbar would occupy.
              <div className={styles.tableToolbar}>
                <ExportMenu filters={filters} />
              </div>
            )}
          </>
        ) : null}
      </main>
      <SearchChatPanel />
    </div>
  );
}
