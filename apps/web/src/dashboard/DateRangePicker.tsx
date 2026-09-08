import { useState, type ChangeEvent } from 'react';

import buttons from '../styles/buttons.module.css';
import styles from './DateRangePicker.module.css';
import popover from './Popover.module.css';
import { usePopover } from './usePopover';

export interface DateRangePickerProps {
  from: string | undefined;
  to: string | undefined;
  onChange: (patch: { from: string | undefined; to: string | undefined }) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

type RelativeDirection = 'last' | 'next';
type RelativeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

const RELATIVE_UNITS: { value: RelativeUnit; label: string; labelSingular: string }[] = [
  { value: 'minutes', label: 'Minutes', labelSingular: 'Minute' },
  { value: 'hours', label: 'Hours', labelSingular: 'Hour' },
  { value: 'days', label: 'Days', labelSingular: 'Day' },
  { value: 'weeks', label: 'Weeks', labelSingular: 'Week' },
  { value: 'months', label: 'Months', labelSingular: 'Month' },
  { value: 'years', label: 'Years', labelSingular: 'Year' },
];

interface CommonPreset {
  label: string;
  days: number;
}

const COMMONLY_USED: CommonPreset[] = [
  { label: 'Today', days: 0 },
  { label: 'Last 24 hours', days: 1 },
  { label: 'This week', days: 7 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 182 },
  { label: 'Last 1 year', days: 365 },
];

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "now" for the purposes of every relative calculation -- real wall-clock time, same as Kibana. */
function daysAgo(days: number): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { from: toIsoDate(from), to: toIsoDate(now) };
}

const UNIT_TO_MS: Record<RelativeUnit, number> = {
  minutes: 60_000,
  hours: 60 * 60_000,
  days: 24 * 60 * 60_000,
  weeks: 7 * 24 * 60 * 60_000,
  months: 30 * 24 * 60 * 60_000,
  years: 365 * 24 * 60 * 60_000,
};

/**
 * Resolves a "Last/Next N Unit" pick to concrete dates against real "now". apps/api's date
 * filters are day-granularity (matching data/*.csv, which have no time-of-day component), so a
 * sub-day amount (e.g. "Last 15 Minutes") still resolves to a real, correct date -- it just can't
 * distinguish itself from "Last 1 Hour" once truncated to a day. That's an honest consequence of
 * the underlying data's precision, not a bug in this control.
 */
function relativeRange(
  direction: RelativeDirection,
  amount: number,
  unit: RelativeUnit,
): { from: string; to: string } {
  const now = new Date();
  const offset = new Date(
    now.getTime() + (direction === 'last' ? -1 : 1) * amount * UNIT_TO_MS[unit],
  );
  return direction === 'last'
    ? { from: toIsoDate(offset), to: toIsoDate(now) }
    : { from: toIsoDate(now), to: toIsoDate(offset) };
}

const DISPLAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDisplayDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  const [year = 0, month = 1, day = 1] = parts;
  return DISPLAY_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

function absoluteLabel(from: string | undefined, to: string | undefined): string {
  if (!from && !to) return 'All time';
  if (from && to) return `${formatDisplayDate(from)} → ${formatDisplayDate(to)}`;
  if (from) return `From ${formatDisplayDate(from)}`;
  return `Until ${formatDisplayDate(to!)}`;
}

/**
 * Kibana-style time range picker: a "Quick select" relative builder (Last/Next N Unit), a grid
 * of commonly-used presets, and a precise absolute range. docs/product-spec.md never specified
 * this control; it's a direct UX request (see
 * docs/sessions/2026-09-08-epic16-toolbar-redesign.md for the simpler version this replaced).
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  onRefresh,
  isRefreshing = false,
}: DateRangePickerProps): JSX.Element {
  const { isOpen, close, toggle, containerRef } = usePopover<HTMLDivElement>();

  const [label, setLabel] = useState(() => absoluteLabel(from, to));
  const [draftFrom, setDraftFrom] = useState(from ?? '');
  const [draftTo, setDraftTo] = useState(to ?? '');
  const [relativeDirection, setRelativeDirection] = useState<RelativeDirection>('last');
  const [relativeAmount, setRelativeAmount] = useState(15);
  const [relativeUnit, setRelativeUnit] = useState<RelativeUnit>('minutes');

  function openPanel(): void {
    setDraftFrom(from ?? '');
    setDraftTo(to ?? '');
    toggle();
  }

  function applyCommonPreset(preset: CommonPreset): void {
    onChange(daysAgo(preset.days));
    setLabel(preset.label);
    close();
  }

  function applyRelative(): void {
    onChange(relativeRange(relativeDirection, relativeAmount, relativeUnit));
    const unitLabel =
      relativeAmount === 1
        ? RELATIVE_UNITS.find((u) => u.value === relativeUnit)!.labelSingular
        : RELATIVE_UNITS.find((u) => u.value === relativeUnit)!.label;
    setLabel(`${relativeDirection === 'last' ? 'Last' : 'Next'} ${relativeAmount} ${unitLabel}`);
    close();
  }

  function applyAbsolute(): void {
    onChange({ from: draftFrom || undefined, to: draftTo || undefined });
    setLabel(absoluteLabel(draftFrom || undefined, draftTo || undefined));
    close();
  }

  function clearRange(): void {
    onChange({ from: undefined, to: undefined });
    setLabel('All time');
    close();
  }

  return (
    <div className={styles.wrapper}>
      <div className={popover.wrapper} ref={containerRef}>
        <button
          type="button"
          className={styles.rangeButton}
          aria-haspopup="true"
          aria-expanded={isOpen}
          onClick={openPanel}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect
              x="2"
              y="3"
              width="12"
              height="11"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {label}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M2 3.5 5 6.5 8 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {isOpen ? (
          <div
            className={`${popover.panel} ${popover.panelLeft} ${styles.rangePanel}`}
            role="dialog"
            aria-label="Select date range"
          >
            <section className={styles.section}>
              <p className={popover.panelHeading}>Quick select</p>
              <div className={styles.relativeRow}>
                <label className="visually-hidden" htmlFor="range-direction">
                  Direction
                </label>
                <select
                  id="range-direction"
                  value={relativeDirection}
                  onChange={(event) =>
                    setRelativeDirection(event.target.value as RelativeDirection)
                  }
                >
                  <option value="last">Last</option>
                  <option value="next">Next</option>
                </select>
                <label className="visually-hidden" htmlFor="range-amount">
                  Amount
                </label>
                <input
                  id="range-amount"
                  type="number"
                  min={1}
                  className={styles.amountInput}
                  value={relativeAmount}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setRelativeAmount(Math.max(1, Number(event.target.value) || 1))
                  }
                />
                <label className="visually-hidden" htmlFor="range-unit">
                  Unit
                </label>
                <select
                  id="range-unit"
                  value={relativeUnit}
                  onChange={(event) => setRelativeUnit(event.target.value as RelativeUnit)}
                >
                  {RELATIVE_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={buttons.primary}
                  onClick={applyRelative}
                  aria-label="Apply relative range"
                >
                  Apply
                </button>
              </div>
            </section>

            <hr className={styles.divider} />

            <section className={styles.section}>
              <p className={popover.panelHeading}>Commonly used</p>
              <div className={styles.presetGrid}>
                {COMMONLY_USED.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={styles.presetButton}
                    onClick={() => applyCommonPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>

            <hr className={styles.divider} />

            <section className={styles.section}>
              <p className={popover.panelHeading}>Absolute range</p>
              <div className={styles.absoluteRow}>
                <label className={styles.absoluteField}>
                  <span className="visually-hidden">Start date</span>
                  <input
                    type="date"
                    value={draftFrom}
                    max={draftTo || undefined}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setDraftFrom(event.target.value)
                    }
                  />
                </label>
                <span aria-hidden="true">&ndash;</span>
                <label className={styles.absoluteField}>
                  <span className="visually-hidden">End date</span>
                  <input
                    type="date"
                    value={draftTo}
                    min={draftFrom || undefined}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setDraftTo(event.target.value)
                    }
                  />
                </label>
              </div>
              <div className={styles.actions}>
                <button type="button" className={buttons.secondary} onClick={clearRange}>
                  Clear
                </button>
                <button
                  type="button"
                  className={buttons.primary}
                  onClick={applyAbsolute}
                  aria-label="Apply absolute range"
                >
                  Apply
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={buttons.icon}
        aria-label={isRefreshing ? 'Refreshing reconciliation data' : 'Refresh reconciliation data'}
        aria-busy={isRefreshing}
        title="Refresh"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <svg
          className={isRefreshing ? styles.refreshSpinning : undefined}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
