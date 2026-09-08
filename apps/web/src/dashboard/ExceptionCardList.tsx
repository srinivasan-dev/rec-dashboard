import { ExceptionCard } from './ExceptionCard';
import cardStyles from './ExceptionCard.module.css';
import type { ExceptionsTableProps } from './ExceptionsTable';
import styles from './ExceptionsTable.module.css';
import { PaginationControls } from './PaginationControls';

/**
 * Mobile/tablet-portrait replacement for ExceptionsTable (see docs/product-spec.md §11) --
 * identical props contract so ExceptionsTable.tsx can swap to this at the useIsTabletOrBelow()
 * breakpoint without Dashboard.tsx needing to know which layout is active. "Expand all"/
 * "Collapse all" now live in the merged Toolbar row above (Toolbar.tsx) rather than duplicated
 * here -- one instance controls whichever layout (table or cards) is actually rendered.
 */
export function ExceptionCardList({
  exceptions,
  pagination,
  onPageChange,
  onPageSizeChange,
  searchQuery,
}: ExceptionsTableProps): JSX.Element {
  return (
    <div className={styles.wrapper}>
      <ul className={cardStyles.list} aria-label="Exceptions needing review">
        {exceptions.map((exception) => (
          <ExceptionCard
            key={exception.transactionId}
            exception={exception}
            searchQuery={searchQuery}
          />
        ))}
      </ul>

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
