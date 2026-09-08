import { arc as d3Arc, pie as d3Pie } from 'd3-shape';
import { memo, useMemo } from 'react';
import type { SummaryDto } from '../api/types';
import styles from './ReconciliationPieChart.module.css';

export interface ReconciliationPieChartProps {
  summary: SummaryDto;
}

interface Slice {
  label: string;
  value: number;
  color: string;
}

const SIZE = 200;
const RADIUS = SIZE / 2;
const INNER_RADIUS = RADIUS * 0.62;

const pieLayout = d3Pie<Slice>()
  .value((d) => d.value)
  .sort(null);
const arcGenerator = d3Arc<{ startAngle: number; endAngle: number }>()
  .innerRadius(INNER_RADIUS)
  .outerRadius(RADIUS)
  .cornerRadius(3)
  .padAngle(0.015);

/**
 * Temporary widget-section experiment (docs/sessions) -- a D3 donut standing in for
 * SummaryCards' matched/exceptions split while both render side by side for comparison. Reuses
 * the same theme tokens as SummaryCards (positive/attention) so it reads as one design system,
 * not a bolted-on library demo.
 *
 * Renders arcs declaratively as JSX `<path>`s (d3-shape only computes the `d` string) rather than
 * the earlier version's imperative `svg.appendChild`/`removeChild` in a `useEffect` -- that
 * approach mutated the SVG's real DOM behind React's back, which crashed the whole app
 * (`NotFoundError: Failed to execute 'removeChild'`) the moment the empty-state `<circle>`
 * fallback and the imperative rebuild both tried to reconcile the same node (e.g. a date-range
 * filter narrowing the summary to zero checked transactions). Letting React own every node in
 * this tree removes that class of bug entirely.
 */
export const ReconciliationPieChart = memo(function ReconciliationPieChart({
  summary,
}: ReconciliationPieChartProps): JSX.Element {
  const slices: Slice[] = useMemo(
    () =>
      [
        { label: 'Matched', value: summary.matchedCount, color: 'var(--chart-matched)' },
        { label: 'Exceptions', value: summary.exceptionCount, color: 'var(--chart-exceptions)' },
      ].filter((slice) => slice.value > 0),
    [summary.matchedCount, summary.exceptionCount],
  );

  const arcs = useMemo(() => pieLayout(slices), [slices]);

  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>Matched vs. exceptions</h2>
      <div className={styles.body}>
        <div className={styles.chartWrap}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            role="img"
            aria-label={`${summary.matchedCount} matched, ${summary.exceptionCount} exceptions, out of ${summary.totalChecked} checked`}
          >
            <g transform={`translate(${RADIUS}, ${RADIUS})`}>
              {slices.length === 0 ? (
                <circle cx={0} cy={0} r={RADIUS} fill="var(--color-border)" />
              ) : (
                arcs.map((arcDatum, index) => (
                  <path
                    key={arcDatum.data.label}
                    d={arcGenerator(arcDatum) ?? undefined}
                    fill={arcDatum.data.color}
                    className={styles.slice}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <title>
                      {arcDatum.data.label}: {arcDatum.data.value}
                    </title>
                  </path>
                ))
              )}
            </g>
          </svg>
          <div className={styles.centerLabel}>
            <span className={styles.centerValue}>{summary.totalChecked}</span>
            <span className={styles.centerCaption}>Checked</span>
          </div>
        </div>
        <ul className={styles.legend}>
          <li className={styles.legendItem}>
            <span className={styles.legendDot} data-tone="positive" />
            Matched <strong>{summary.matchedCount}</strong>
          </li>
          <li className={styles.legendItem}>
            <span className={styles.legendDot} data-tone="attention" />
            Exceptions <strong>{summary.exceptionCount}</strong>
          </li>
        </ul>
      </div>
    </div>
  );
});
