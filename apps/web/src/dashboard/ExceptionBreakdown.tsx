import type { ExceptionReason } from '../api/types';
import { EXCEPTION_LABELS } from './exceptionLabels';
import styles from './ExceptionBreakdown.module.css';

export interface ExceptionBreakdownProps {
  exceptionsByReason: Record<ExceptionReason, number>;
  totalExceptionCount: number;
  selectedReason: ExceptionReason | undefined;
  onSelect: (reason: ExceptionReason | undefined) => void;
}

/**
 * docs/product-spec.md §7 "What kind of problems?" -- categorized counts, zero-count reasons
 * hidden. Each pill is also a filter shortcut: clicking one sets the same `reason` URL filter
 * FilterMenu.tsx controls, "All" clears it. `severity` (exceptionLabels.ts) drives amber-vs-gray,
 * matching the reason pill colors already used in ExceptionsTable.
 */
export function ExceptionBreakdown({
  exceptionsByReason,
  totalExceptionCount,
  selectedReason,
  onSelect,
}: ExceptionBreakdownProps): JSX.Element {
  const entries = (Object.entries(exceptionsByReason) as [ExceptionReason, number][]).filter(
    ([, count]) => count > 0,
  );

  return (
    <div className={styles.wrapper}>
      <h2 id="exception-breakdown-heading" className={styles.heading}>
        Exception breakdown
      </h2>
      <ul className={styles.list} aria-labelledby="exception-breakdown-heading">
        <li>
          <button
            type="button"
            className={styles.pill}
            data-active={selectedReason === undefined}
            aria-pressed={selectedReason === undefined}
            onClick={() => onSelect(undefined)}
          >
            All &middot; {totalExceptionCount}
          </button>
        </li>
        {entries.map(([reason, count]) => (
          <li key={reason}>
            <button
              type="button"
              className={styles.pill}
              data-severity={EXCEPTION_LABELS[reason].severity}
              data-active={selectedReason === reason}
              aria-pressed={selectedReason === reason}
              onClick={() => onSelect(reason)}
            >
              {EXCEPTION_LABELS[reason].title} &middot; {count}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
