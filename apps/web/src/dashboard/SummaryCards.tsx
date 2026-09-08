import type { SummaryDto } from '../api/types';
import { formatCurrencyAmount } from './formatting';
import styles from './SummaryCards.module.css';

export interface SummaryCardsProps {
  summary: SummaryDto;
}

/**
 * docs/product-spec.md §7: "Checked / Matched / Exceptions / Impact" cards. Impact is shown as
 * one line per currency -- never summed across currencies (§15 risk: multi-currency
 * aggregation would be financially meaningless).
 */
export function SummaryCards({ summary }: SummaryCardsProps): JSX.Element {
  return (
    <dl className={styles.grid}>
      <div className={styles.card}>
        <dt className={styles.label}>Checked</dt>
        <dd className={styles.value}>{summary.totalChecked}</dd>
      </div>
      <div className={styles.card}>
        <dt className={styles.label}>Matched</dt>
        <dd className={styles.value} data-tone="positive">
          {summary.matchedCount}
        </dd>
      </div>
      <div className={styles.card}>
        <dt className={styles.label}>Exceptions</dt>
        <dd
          className={styles.value}
          data-tone={summary.exceptionCount > 0 ? 'attention' : undefined}
        >
          {summary.exceptionCount}
        </dd>
      </div>
      <div className={styles.card}>
        <dt className={styles.label}>Financial impact</dt>
        <dd>
          {summary.financialImpactByCurrency.length === 0 ? (
            <span className={styles.impactEmpty}>No financial impact</span>
          ) : (
            <ul className={styles.impactList}>
              {summary.financialImpactByCurrency.map((impact) => (
                <li key={impact.currency} className={styles.impactItem}>
                  {formatCurrencyAmount(impact.currency, impact.amount)}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </div>
    </dl>
  );
}
