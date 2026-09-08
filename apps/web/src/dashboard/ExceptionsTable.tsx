import { Fragment } from 'react';

import type { ExceptionDto, Pagination, SortBy, SortOrder } from '../api/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { allRowsCollapsed, allRowsExpanded, rowExpandToggled } from '../store/uiSlice';
import { ExceptionDetailPanel } from './ExceptionDetailPanel';
import { EXCEPTION_LABELS } from './exceptionLabels';
import { exceptionAmountSummary, exceptionDate, formatCurrencyAmount } from './formatting';
import styles from './ExceptionsTable.module.css';
import { Highlight } from './Highlight';

export interface ExceptionsTableProps {
  exceptions: ExceptionDto[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy) => void;
  /** Omitted entirely in search mode -- search results aren't paginated (docs/sessions/
   *  2026-09-08-epic17-search-and-inline-detail.md caps them server-side instead). */
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  /** Highlights and, from the caller's perspective, has already filtered `exceptions` to matches. */
  searchQuery?: string | null;
}

interface SortableColumn {
  sortBy: SortBy;
  label: string;
}

const SORTABLE_COLUMNS: SortableColumn[] = [
  { sortBy: 'transactionId', label: 'Transaction' },
  { sortBy: 'reason', label: 'Reason' },
  { sortBy: 'transactionDate', label: 'Date' },
  { sortBy: 'differenceAmount', label: 'Difference' },
];

function ariaSortFor(
  column: SortBy,
  sortBy: SortBy,
  sortOrder: SortOrder,
): 'ascending' | 'descending' | 'none' {
  if (sortBy !== column) return 'none';
  return sortOrder === 'asc' ? 'ascending' : 'descending';
}

/**
 * docs/product-spec.md §7 exceptions table. Sortable headers are real <button>s (not a div click
 * handler); rows are keyboard-actionable via a real <button> expand/collapse toggle. Pagination
 * is server-side outside search mode -- this component never fetches or slices more than one
 * page itself.
 *
 * Exception detail is now inline (ExceptionDetailPanel), not a drawer -- expand state lives in
 * Redux (`expandedTransactionIds`) rather than local state, so "Expand all"/"Collapse all" can
 * act on every row without this component needing to reach into a parent. See
 * docs/sessions/2026-09-08-epic17-search-and-inline-detail.md.
 */
export function ExceptionsTable({
  exceptions,
  sortBy,
  sortOrder,
  onSortChange,
  pagination,
  onPageChange,
  searchQuery,
}: ExceptionsTableProps): JSX.Element {
  const dispatch = useAppDispatch();
  const expandedIds = useAppSelector((state) => state.ui.expandedTransactionIds);
  const expandedSet = new Set(expandedIds);
  const allExpanded =
    exceptions.length > 0 && exceptions.every((e) => expandedSet.has(e.transactionId));

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableActions}>
        <button
          type="button"
          className={styles.tableActionButton}
          onClick={() => dispatch(allRowsExpanded(exceptions.map((e) => e.transactionId)))}
          disabled={exceptions.length === 0 || allExpanded}
        >
          Expand all
        </button>
        <button
          type="button"
          className={styles.tableActionButton}
          onClick={() => dispatch(allRowsCollapsed())}
          disabled={expandedIds.length === 0}
        >
          Collapse all
        </button>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>Exceptions needing review</caption>
          <thead>
            <tr>
              <th
                className={`${styles.headerCell} ${styles.plainHeaderCell} ${styles.expandHeaderCell}`}
                scope="col"
              >
                <span className="visually-hidden">Expand</span>
              </th>
              {SORTABLE_COLUMNS.map((column) => {
                const sort = ariaSortFor(column.sortBy, sortBy, sortOrder);
                return (
                  <th
                    key={column.sortBy}
                    className={styles.headerCell}
                    scope="col"
                    aria-sort={sort}
                  >
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => onSortChange(column.sortBy)}
                    >
                      {column.label}
                      {sort !== 'none' ? (
                        <span className={styles.sortCaret} aria-hidden="true">
                          {sort === 'ascending' ? '▲' : '▼'}
                        </span>
                      ) : null}
                    </button>
                  </th>
                );
              })}
              <th className={`${styles.headerCell} ${styles.plainHeaderCell}`} scope="col">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((exception) => {
              const label = EXCEPTION_LABELS[exception.reason];
              const isExpanded = expandedSet.has(exception.transactionId);
              return (
                <Fragment key={exception.transactionId}>
                  <tr id={`exception-row-${exception.transactionId}`} className={styles.row}>
                    <td className={`${styles.cell} ${styles.expandCell}`}>
                      <button
                        type="button"
                        className={styles.expandToggle}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for transaction ${exception.transactionId}`}
                        onClick={() => dispatch(rowExpandToggled(exception.transactionId))}
                      >
                        <span aria-hidden="true" className={styles.expandCaret}>
                          {isExpanded ? '▾' : '▸'}
                        </span>
                      </button>
                    </td>
                    <td className={`${styles.cell} ${styles.transactionId}`}>
                      <Highlight text={exception.transactionId} query={searchQuery} />
                    </td>
                    <td className={styles.cell}>
                      <span className={styles.reasonPill} data-severity={label.severity}>
                        <Highlight text={label.title} query={searchQuery} />
                      </span>
                    </td>
                    <td className={styles.cell}>{exceptionDate(exception)}</td>
                    <td className={styles.cellNumeric}>
                      {exception.differenceAmount === null
                        ? '—'
                        : formatCurrencyAmount(exception.currency, exception.differenceAmount)}
                    </td>
                    <td className={styles.cellNumeric}>
                      <Highlight text={exceptionAmountSummary(exception)} query={searchQuery} />
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className={styles.detailRow}>
                      <td className={styles.detailCell} colSpan={6}>
                        <ExceptionDetailPanel transactionId={exception.transactionId} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && onPageChange ? (
        <nav className={styles.pagination} aria-label="Exceptions pagination">
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
