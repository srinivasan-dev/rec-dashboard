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
            ? `All ${totalChecked} transactions are reconciled`
            : `${exceptionCount} transaction${exceptionCount === 1 ? '' : 's'} need your review`}
        </span>
        <span className={styles.subtitle}>
          {allClear
            ? 'Every settlement matches its ledger record — nothing needs your attention today.'
            : `${matchedCount} of ${totalChecked} matched automatically — the rest have discrepancies worth a quick look.`}
        </span>
      </span>
    </div>
  );
}
