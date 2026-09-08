import styles from './StatusBanner.module.css';

export interface StatusBannerProps {
  totalChecked: number;
  matchedCount: number;
  exceptionCount: number;
}

/**
 * The single, scannable status line -- the first thing a merchant reads (docs/product-spec.md
 * §7). Status is conveyed by an icon + text together, never color alone (§12 accessibility
 * commitment).
 */
export function StatusBanner({
  totalChecked,
  matchedCount,
  exceptionCount,
}: StatusBannerProps): JSX.Element {
  const allClear = exceptionCount === 0;

  return (
    <div
      className={styles.banner}
      role="status"
      aria-live="polite"
      data-tone={allClear ? 'positive' : 'attention'}
    >
      <span className={styles.icon} aria-hidden="true">
        {allClear ? '✓' : '!'}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>
          {allClear
            ? `All ${totalChecked} transactions reconciled — you're all clear.`
            : `${exceptionCount} of ${totalChecked} transactions need attention`}
        </span>
        <span className={styles.subtitle}>
          {allClear
            ? 'No exceptions found. All settlement amounts, dates, and records align.'
            : `${matchedCount} matched. ${exceptionCount} have discrepancies that may need review.`}
        </span>
      </span>
    </div>
  );
}
