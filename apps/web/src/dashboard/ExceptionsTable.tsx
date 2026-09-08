import { Fragment } from 'react';

import type { Pagination, SortBy, SortOrder, TransactionDto } from '../api/types';
import { useIsTabletOrBelow } from '../hooks/useMediaQuery';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { rowExpandToggled } from '../store/uiSlice';
import { ExceptionCardList } from './ExceptionCardList';
import { ExceptionDetailPanel } from './ExceptionDetailPanel';
import { reasonLabelFor } from './exceptionLabels';
import { exceptionAmountSummary, exceptionDate, formatCurrencyAmount } from './formatting';
import styles from './ExceptionsTable.module.css';
import { Highlight } from './Highlight';
import { PaginationControls } from './PaginationControls';

export interface ExceptionsTableProps {
  /** `ExceptionDto[]` (exceptions-only, the default table) or `TransactionDto[]` (Toolbar.tsx's
   *  "show matched transactions" checkbox) -- `ExceptionDto` is always assignable here. */
  exceptions: TransactionDto[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy) => void;
  /** Omitted entirely in search mode -- search results aren't paginated (docs/sessions/
   *  2026-09-08-epic17-search-and-inline-detail.md caps them server-side instead). */
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  /** Also omitted in search mode, same reasoning as `onPageChange` above. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Highlights and, from the caller's perspective, has already filtered `exceptions` to matches. */
  searchQuery?: string | null;
}

interface SortableColumn {
  sortBy: SortBy;
  label: string;
  /** Right-aligns the header to match its column's numeric, right-aligned cells (`.cellNumeric`)
   *  below -- left-aligned headers over right-aligned figures read as misaligned. */
  numeric?: boolean;
}

const SORTABLE_COLUMNS: SortableColumn[] = [
  { sortBy: 'transactionId', label: 'Transaction' },
  { sortBy: 'reason', label: 'Reason' },
  { sortBy: 'transactionDate', label: 'Date' },
  { sortBy: 'differenceAmount', label: 'Difference', numeric: true },
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
 * Redux (`expandedTransactionIds`) rather than local state, so "Expand all"/"Collapse all"
 * (Toolbar.tsx's merged toolbar row, above this component) can act on every row without needing a
 * ref into this one. See docs/sessions/2026-09-08-epic17-search-and-inline-detail.md.
 */
export function ExceptionsTable(props: ExceptionsTableProps): JSX.Element {
  const isCardLayout = useIsTabletOrBelow();
  if (isCardLayout) {
    return <ExceptionCardList {...props} />;
  }
  return <ExceptionsTableGrid {...props} />;
}

function ExceptionsTableGrid({
  exceptions,
  sortBy,
  sortOrder,
  onSortChange,
  pagination,
  onPageChange,
  onPageSizeChange,
  searchQuery,
}: ExceptionsTableProps): JSX.Element {
  const dispatch = useAppDispatch();
  const expandedIds = useAppSelector((state) => state.ui.expandedTransactionIds);
  const expandedSet = new Set(expandedIds);

  return (
    <div className={styles.wrapper}>
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
                    className={`${styles.headerCell} ${column.numeric ? styles.headerCellNumeric : ''}`}
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
              <th
                className={`${styles.headerCell} ${styles.plainHeaderCell} ${styles.headerCellNumeric}`}
                scope="col"
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((exception) => {
              const label = reasonLabelFor(exception.reason);
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
                        <svg
                          aria-hidden="true"
                          className={styles.expandCaret}
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M6 4l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
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
        <PaginationControls
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
