import { scaleLinear } from 'd3-scale';
import { memo, useMemo } from 'react';
import { parseAmountToMinorUnits } from '@rapyd-portal/shared';
import type { DateRangeFilters } from '../api/reconciliation';
import type { SummaryDto } from '../api/types';
import { useCurrencyTotals } from '../hooks/useCurrencyTotals';
import { formatCurrencyAmount } from './formatting';
import styles from './FinancialImpactBarChart.module.css';

export interface FinancialImpactBarChartProps {
  /** The shared date-range picker's from/to (SearchHero.tsx) -- narrows the totals to the same
   *  window the table is filtered to. */
  dateRange: DateRangeFilters;
  /** Same summary object the widget row's other two charts already use -- its
   *  `financialImpactByCurrency` is this chart's "yet to receive" series (see below). */
  summary: SummaryDto;
}

/**
 * Per currency: how much has already settled vs. how much is still outstanding. "Already settled"
 * is `getCurrencyTotals`'s settlement-side total across every checked transaction (matched and
 * exceptions alike). "Yet to receive" is deliberately *not* the ledger total (that combines
 * matched pairs, where nothing is actually outstanding, with real gaps, overstating the picture)
 * -- it's `summary.financialImpactByCurrency`, the same deterministic, per-exception-reason figure
 * `packages/shared/reconcile.ts`'s `financialImpactFor` already computes for the summary banner:
 * the missing/mismatched amount for MISSING_LEDGER, MISSING_SETTLEMENT, and AMOUNT_MISMATCH, and
 * deliberately null (excluded, not zero) for DUPLICATE_LEDGER/DATE_MISMATCH/CURRENCY_MISMATCH,
 * whose "impact" isn't a real number to report (docs/product-spec.md §15). No client-side
 * estimation here either way -- both series are server-computed integer-minor-unit totals.
 */
export const FinancialImpactBarChart = memo(function FinancialImpactBarChart({
  dateRange,
  summary,
}: FinancialImpactBarChartProps): JSX.Element {
  const totalsQuery = useCurrencyTotals(dateRange);
  const totals = totalsQuery.data ?? [];

  const yetToReceiveByCurrency = useMemo(() => {
    const map = new Map<string, string>();
    for (const impact of summary.financialImpactByCurrency) {
      map.set(impact.currency, impact.amount);
    }
    return map;
  }, [summary.financialImpactByCurrency]);

  // Each row scales against its own settled+yet-to-receive total, not a max shared across every
  // currency on the card -- currencies aren't comparable amounts (docs/architecture.md §8 non-
  // negotiable: never sum or compare across currencies), so AED's total being much larger than
  // EUR's shouldn't shrink EUR's bar to a sliver. Every row's own two segments still always sum to
  // a full bar, which is the only comparison this chart makes.
  const rows = useMemo(
    () =>
      totals.map((row) => {
        const settledMinor = parseAmountToMinorUnits(row.settlementAmount);
        const yetToReceiveMinor = parseAmountToMinorUnits(
          yetToReceiveByCurrency.get(row.currency) ?? '0.00',
        );
        const scale = scaleLinear()
          .domain([0, Math.max(1, settledMinor + yetToReceiveMinor)])
          .range([0, 100])
          .clamp(true);
        const settledPct = scale(settledMinor);
        const yetToReceivePct = scale(yetToReceiveMinor);

        // Callout label positions: centered over each segment, then clamped so a label can't run
        // off the card's edge when its segment sits right at 0% or 100% (e.g. USD today, whose
        // "yet to receive" sliver is ~0.3% wide -- its raw center would land at ~99.8%). If a tiny
        // segment leaves the two centers too close together, push them apart around their shared
        // midpoint, then clamp again so the push itself can't shove one back off the edge.
        const MIN_PCT = 12;
        const MAX_PCT = 88;
        const MIN_GAP = 22;
        let settledLabelPct = Math.min(MAX_PCT, Math.max(MIN_PCT, settledPct / 2));
        let yetToReceiveLabelPct = Math.min(
          MAX_PCT,
          Math.max(MIN_PCT, settledPct + yetToReceivePct / 2),
        );
        const gap = yetToReceiveLabelPct - settledLabelPct;
        if (gap < MIN_GAP) {
          const midpoint = (settledLabelPct + yetToReceiveLabelPct) / 2;
          settledLabelPct = Math.min(MAX_PCT, Math.max(MIN_PCT, midpoint - MIN_GAP / 2));
          yetToReceiveLabelPct = Math.min(MAX_PCT, Math.max(MIN_PCT, midpoint + MIN_GAP / 2));
        }

        return {
          currency: row.currency,
          settledAmount: row.settlementAmount,
          yetToReceiveAmount: yetToReceiveByCurrency.get(row.currency) ?? '0.00',
          settledPct,
          yetToReceivePct,
          settledLabelPct,
          yetToReceiveLabelPct,
          noImpactExceptionCount: row.noImpactExceptionCount,
        };
      }),
    [totals, yetToReceiveByCurrency],
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>Financial impact by currency</h2>
      {totalsQuery.isLoading ? <p className={styles.status}>Loading amounts...</p> : null}
      {totalsQuery.isError ? (
        <p className={styles.status}>Couldn&apos;t load currency totals right now.</p>
      ) : null}
      {rows.length === 0 && totalsQuery.isSuccess ? (
        <p className={styles.status}>No financial impact</p>
      ) : null}
      {rows.length > 0 ? (
        <div className={styles.chart}>
          {rows.map((row) => {
            const settledLabel = `Already settled: ${formatCurrencyAmount(row.currency, row.settledAmount)}`;
            const yetToReceiveLabel = `Yet to receive: ${formatCurrencyAmount(row.currency, row.yetToReceiveAmount)}`;
            return (
              <div key={row.currency} className={styles.rowGroup}>
                <div className={styles.row}>
                  <span className={styles.currencyLabel}>{row.currency}</span>
                  <div className={styles.barWrap}>
                    <span
                      className={`${styles.callout} ${styles.calloutSettled}`}
                      style={{ left: `${row.settledLabelPct}%` }}
                    >
                      {formatCurrencyAmount(row.currency, row.settledAmount)}
                    </span>
                    <span
                      className={`${styles.callout} ${styles.calloutPending}`}
                      style={{ left: `${row.yetToReceiveLabelPct}%` }}
                    >
                      {formatCurrencyAmount(row.currency, row.yetToReceiveAmount)}
                    </span>
                    {/* Native `title` tooltip (same pattern as the other two widgets' SVG
                        <title>s) -- the callouts above are the primary label now, but hover
                        still works for touch/magnifier users; the track carries both figures,
                        each segment its own. */}
                    <div
                      className={styles.barTrack}
                      title={`${settledLabel} · ${yetToReceiveLabel}`}
                    >
                      <div
                        className={styles.barFillSettlement}
                        style={{ width: `${row.settledPct}%` }}
                        title={settledLabel}
                      />
                      <div
                        className={styles.barFillPending}
                        style={{ width: `${row.yetToReceivePct}%` }}
                        title={yetToReceiveLabel}
                      />
                    </div>
                  </div>
                </div>
                {row.noImpactExceptionCount > 0 ? (
                  <span
                    className={styles.reviewBadge}
                    title={`${row.noImpactExceptionCount} exception${row.noImpactExceptionCount === 1 ? '' : 's'} in ${row.currency} ${row.noImpactExceptionCount === 1 ? 'has' : 'have'} no ${row.currency} impact to show -- duplicate entries or date/currency mismatches. See the table below.`}
                  >
                    <span aria-hidden="true">⚠</span> {row.noImpactExceptionCount}{' '}
                    {row.noImpactExceptionCount === 1 ? 'needs' : 'need'} review
                  </span>
                ) : null}
              </div>
            );
          })}
          <ul className={styles.legend}>
            <li className={styles.legendItem}>
              <span className={styles.legendDot} data-series="settlement" />
              Already settled
            </li>
            <li className={styles.legendItem}>
              <span className={styles.legendDot} data-series="pending" />
              Yet to receive
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
});
