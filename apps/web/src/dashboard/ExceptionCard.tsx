import type { TransactionDto } from '../api/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { rowExpandToggled } from '../store/uiSlice';
import { ExceptionDetailPanel } from './ExceptionDetailPanel';
import styles from './ExceptionCard.module.css';
import { reasonLabelFor } from './exceptionLabels';
import { exceptionAmountSummary, exceptionDate } from './formatting';
import { Highlight } from './Highlight';

export interface ExceptionCardProps {
  exception: TransactionDto;
  searchQuery?: string | null;
}

/**
 * Mobile/tablet-portrait stand-in for one <tr> of ExceptionsTable (see
 * docs/product-spec.md §11 -- stacked cards instead of a horizontal-scrolling table below
 * tablet-landscape width). Reuses the exact same data helpers and Redux expand state
 * (`expandedTransactionIds`/`rowExpandToggled`) as the table, so switching between the two at the
 * 1024px breakpoint never loses or duplicates expand state.
 */
export function ExceptionCard({ exception, searchQuery }: ExceptionCardProps): JSX.Element {
  const dispatch = useAppDispatch();
  const isExpanded = useAppSelector((state) =>
    state.ui.expandedTransactionIds.includes(exception.transactionId),
  );
  const label = reasonLabelFor(exception.reason);

  return (
    <li id={`exception-row-${exception.transactionId}`} className={styles.card}>
      <button
        type="button"
        className={styles.cardHeader}
        aria-expanded={isExpanded}
        onClick={() => dispatch(rowExpandToggled(exception.transactionId))}
      >
        <span className={styles.transactionId}>
          <Highlight text={exception.transactionId} query={searchQuery} />
        </span>
        <span className={styles.reasonPill} data-severity={label.severity}>
          <Highlight text={label.title} query={searchQuery} />
        </span>
        <span className={styles.meta}>
          <span>{exceptionDate(exception)}</span>
          <span className={styles.amount}>
            <Highlight text={exceptionAmountSummary(exception)} query={searchQuery} />
          </span>
        </span>
        <span aria-hidden="true" className={styles.expandCaret}>
          {isExpanded ? '▾' : '▸'}
        </span>
      </button>

      {isExpanded ? (
        <div className={styles.detail}>
          <button
            type="button"
            className={styles.closeButton}
            aria-label={`Close details for transaction ${exception.transactionId}`}
            onClick={() => dispatch(rowExpandToggled(exception.transactionId))}
          >
            <span aria-hidden="true">✕</span> Close
          </button>
          <ExceptionDetailPanel transactionId={exception.transactionId} />
        </div>
      ) : null}
    </li>
  );
}
