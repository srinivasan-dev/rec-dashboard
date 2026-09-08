import { arc as d3Arc, pie as d3Pie } from 'd3-shape';
import { memo, useCallback, useMemo, useState } from 'react';
import type { ExceptionReason, SummaryDto } from '../api/types';
import { EXCEPTION_LABELS } from './exceptionLabels';
import styles from './ExceptionsByReasonChart.module.css';

export interface ExceptionsByReasonChartProps {
  summary: SummaryDto;
}

/** One shade per reason, in two analogous families tied to the chart palette used elsewhere on
 *  this page: amber/orange for "amount" severity reasons (money doesn't line up), violet for
 *  "structural" reasons (the record itself, not the amount) -- see EXCEPTION_LABELS.severity. */
const REASON_COLOR: Record<ExceptionReason, string> = {
  MISSING_LEDGER: '#f59e0b',
  MISSING_SETTLEMENT: '#fb923c',
  AMOUNT_MISMATCH: '#f97316',
  CURRENCY_MISMATCH: '#fbbf24',
  DUPLICATE_LEDGER: '#7c5cd4',
  DATE_MISMATCH: '#a78bfa',
};

const SIZE = 200;
const RADIUS = SIZE / 2;
const INNER_RADIUS = RADIUS * 0.72;
const HOVER_OUTER_RADIUS = RADIUS * 1.08;

interface ReasonEntry {
  reason: ExceptionReason;
  count: number;
  percent: number;
}

const pieLayout = d3Pie<ReasonEntry>()
  .value((d) => d.count)
  .sort(null);
const arcGenerator = d3Arc<{ startAngle: number; endAngle: number }>()
  .innerRadius(INNER_RADIUS)
  .outerRadius(RADIUS)
  .cornerRadius(3)
  .padAngle(0.02);
const hoverArcGenerator = d3Arc<{ startAngle: number; endAngle: number }>()
  .innerRadius(INNER_RADIUS)
  .outerRadius(HOVER_OUTER_RADIUS)
  .cornerRadius(3)
  .padAngle(0.02);

/**
 * docs/sessions widget-section experiment: a thin donut ring (deliberately a different shape
 * language than ReconciliationPieChart's thicker two-slice donut -- a slim ring with a slice
 * that lifts outward on hover/focus, reading more like a "ranked proportion" chart than a
 * simple split) over exceptionsByReason -- the same real counts ExceptionBreakdown already shows
 * as filter pills, no new figures invented. Hovering either a ring segment or its legend row
 * highlights both and swaps the center readout to that reason's count/share; keyboard users get
 * the same highlight via focus on the legend row buttons.
 */
export const ExceptionsByReasonChart = memo(function ExceptionsByReasonChart({
  summary,
}: ExceptionsByReasonChartProps): JSX.Element {
  const [activeReason, setActiveReason] = useState<ExceptionReason | null>(null);

  const entries: ReasonEntry[] = useMemo(() => {
    const total = summary.exceptionCount;
    return (Object.entries(summary.exceptionsByReason) as [ExceptionReason, number][])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({
        reason,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
      }));
  }, [summary.exceptionCount, summary.exceptionsByReason]);

  const arcs = useMemo(() => pieLayout(entries), [entries]);
  const active = entries.find((entry) => entry.reason === activeReason) ?? null;

  const clearActiveReason = useCallback(() => setActiveReason(null), []);

  if (entries.length === 0) {
    return (
      <div className={styles.card}>
        <h2 className={styles.heading}>Exceptions by reason</h2>
        <p className={styles.status}>No exceptions</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>Exceptions by reason</h2>
      <div className={styles.body}>
        <div className={styles.ringWrap}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            role="img"
            aria-label={entries
              .map((entry) => `${EXCEPTION_LABELS[entry.reason].title}: ${entry.count}`)
              .join(', ')}
          >
            <g transform={`translate(${RADIUS}, ${RADIUS})`}>
              {arcs.map((arcDatum) => {
                const isActive = activeReason === arcDatum.data.reason;
                const isDimmed = activeReason !== null && !isActive;
                const d = (isActive ? hoverArcGenerator : arcGenerator)(arcDatum);
                return (
                  <path
                    key={arcDatum.data.reason}
                    d={d ?? undefined}
                    fill={REASON_COLOR[arcDatum.data.reason]}
                    className={styles.slice}
                    data-dimmed={isDimmed}
                    data-active={isActive}
                    onMouseEnter={() => setActiveReason(arcDatum.data.reason)}
                    onMouseLeave={clearActiveReason}
                  >
                    <title>
                      {EXCEPTION_LABELS[arcDatum.data.reason].title}: {arcDatum.data.count}
                    </title>
                  </path>
                );
              })}
            </g>
          </svg>
          <div className={styles.centerLabel}>
            <span className={styles.centerValue}>
              {active ? active.count : summary.exceptionCount}
            </span>
            <span className={styles.centerCaption}>
              {active
                ? `${Math.round(active.percent)}% · ${EXCEPTION_LABELS[active.reason].title}`
                : 'Total exceptions'}
            </span>
          </div>
        </div>

        <ul className={styles.legend}>
          {entries.map((entry) => (
            <li key={entry.reason}>
              <button
                type="button"
                className={styles.legendRow}
                data-active={activeReason === entry.reason}
                onMouseEnter={() => setActiveReason(entry.reason)}
                onMouseLeave={clearActiveReason}
                onFocus={() => setActiveReason(entry.reason)}
                onBlur={clearActiveReason}
              >
                <span className={styles.legendTop}>
                  <span
                    className={styles.legendDot}
                    style={{ background: REASON_COLOR[entry.reason] }}
                  />
                  <span className={styles.legendTitle}>{EXCEPTION_LABELS[entry.reason].title}</span>
                  <span className={styles.legendCount}>{entry.count}</span>
                </span>
                <span className={styles.legendTrack}>
                  <span
                    className={styles.legendFill}
                    style={{ width: `${entry.percent}%`, background: REASON_COLOR[entry.reason] }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});
