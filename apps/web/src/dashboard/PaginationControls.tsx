import type { Pagination } from '../api/types';
import { PAGE_SIZE_OPTIONS } from '../hooks/useExceptionsFilters';
import styles from './ExceptionsTable.module.css';

export interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * Shared by ExceptionsTable.tsx's desktop grid and ExceptionCardList.tsx's mobile/tablet layout --
 * previously each rendered its own identical Previous/Next nav; the page-size selector is added
 * once here rather than duplicated in both. `onPageSizeChange` is optional so a caller that only
 * wants page navigation (there isn't one today, but the prop being optional elsewhere in
 * `ExceptionsTableProps` carries through) still works without it.
 */
export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps): JSX.Element {
  return (
    <nav className={styles.pagination} aria-label="Exceptions pagination">
      {onPageSizeChange ? (
        <div className={styles.pageSizeField}>
          <label htmlFor="exceptions-page-size">Rows per page</label>
          <select
            id="exceptions-page-size"
            className={styles.pageSizeSelect}
            value={pagination.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className={styles.pageNav}>
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
      </div>
    </nav>
  );
}
