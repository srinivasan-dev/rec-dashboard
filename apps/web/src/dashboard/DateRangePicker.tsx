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

type RelativeUnit = 'hours' | 'days' | 'weeks' | 'months' | 'years';

const RELATIVE_UNITS: { value: RelativeUnit; label: string; labelSingular: string }[] = [
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
  hours: 60 * 60_000,
  days: 24 * 60 * 60_000,
  weeks: 7 * 24 * 60 * 60_000,
  months: 30 * 24 * 60 * 60_000,
  years: 365 * 24 * 60 * 60_000,
};

/**
 * Resolves a "Last N Unit" pick to concrete dates against real "now". No "Next" direction --
 * this reviews reconciliation history, and a future-dated range can never match anything in it,
 * so offering one would just be a dead end. apps/api's date filters are day-granularity (matching
 * data/*.csv, which have no time-of-day component), so a sub-day amount (e.g. "Last 3 Hours")
 * still resolves to a real, correct date -- it just can't distinguish itself from "Last 20 Hours"
 * once truncated to a day. "Minutes" was dropped from the unit list entirely for the same reason,
 * one step further: at that granularity every value collapses to "today" regardless, so the unit
 * offered no real precision, just false confidence in it.
 */
function relativeRange(amount: number, unit: RelativeUnit): { from: string; to: string } {
  const now = new Date();
  const offset = new Date(now.getTime() - amount * UNIT_TO_MS[unit]);
  return { from: toIsoDate(offset), to: toIsoDate(now) };
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
 * Kibana-style time range picker: a "Quick select" relative builder (Last N Unit), a grid of
 * commonly-used presets, and a precise absolute range -- all staged behind one shared Apply
 * button at the bottom of the panel (`activeSection` tracks which of Quick select / Absolute
 * range was actually touched, so Apply knows which draft to commit; a preset has nothing to
 * stage and applies immediately on click instead). docs/product-spec.md never specified this
 * control; it's a direct UX request (see docs/sessions/2026-09-08-epic16-toolbar-redesign.md for
 * the simpler version this replaced).
 *
 * Picking a range here never fetches anything by itself -- every method only updates this
 * component's own *pending* selection (`pendingFrom`/`pendingTo`) and the button's preview label.
 * Quick select starts with no amount entered, and nothing is staged until Apply is clicked. The
 * actual `onChange` (which changes the URL-persisted filters that drive every query on the page)
 * fires only when the refresh icon next to this picker is clicked -- a direct request: reviewing
 * reconciliation data shouldn't refetch mid-pick, only once the merchant has decided on a range
 * and explicitly asks to apply it. If the pending range hasn't actually changed, the refresh icon
 * instead falls back to its original job, a plain re-fetch of the current range (`onRefresh`) --
 * so it's never a dead click either way.
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
  const [pendingFrom, setPendingFrom] = useState(from);
  const [pendingTo, setPendingTo] = useState(to);
  const [draftFrom, setDraftFrom] = useState(from ?? '');
  const [draftTo, setDraftTo] = useState(to ?? '');
  // No default amount -- quick select starts empty rather than silently pre-selecting "Last 24
  // Hours", so nothing is picked until the merchant actually chooses a value here.
  const [relativeAmountInput, setRelativeAmountInput] = useState('');
  const [relativeUnit, setRelativeUnit] = useState<RelativeUnit>('hours');
  const relativeAmount = Number(relativeAmountInput);
  const hasValidRelativeAmount = relativeAmountInput.trim() !== '' && relativeAmount > 0;
  // One shared Apply button serves both Quick select and Absolute range (Commonly used applies
  // immediately on click -- there's nothing to fill in first, so it never needs one). This tracks
  // whichever of the other two the merchant actually touched, so the single Apply knows which
  // draft to commit -- not both, and not neither.
  const [activeSection, setActiveSection] = useState<'relative' | 'absolute' | null>(null);

  const hasPendingChange = pendingFrom !== from || pendingTo !== to;

  function openPanel(): void {
    // Reflects the latest *pending* pick, not the last-applied `from`/`to` props -- reopening the
    // popover before hitting refresh shouldn't discard a selection still waiting to be applied.
    setDraftFrom(pendingFrom ?? '');
    setDraftTo(pendingTo ?? '');
    setActiveSection(null);
    toggle();
  }

  function applyCommonPreset(preset: CommonPreset): void {
    const range = daysAgo(preset.days);
    setPendingFrom(range.from);
    setPendingTo(range.to);
    setLabel(preset.label);
    close();
  }

  // The single Apply button below commits whichever of Quick select / Absolute range the
  // merchant actually touched (`activeSection`) -- nothing is fetched until it's clicked, and
  // then the refresh icon is clicked too (see component docstring).
  function handleApply(): void {
    if (activeSection === 'relative') {
      if (!hasValidRelativeAmount) return;
      const range = relativeRange(relativeAmount, relativeUnit);
      setPendingFrom(range.from);
      setPendingTo(range.to);
      const unitLabel =
        relativeAmount === 1
          ? RELATIVE_UNITS.find((u) => u.value === relativeUnit)!.labelSingular
          : RELATIVE_UNITS.find((u) => u.value === relativeUnit)!.label;
      setLabel(`Last ${relativeAmount} ${unitLabel}`);
    } else if (activeSection === 'absolute') {
      setPendingFrom(draftFrom || undefined);
      setPendingTo(draftTo || undefined);
      setLabel(absoluteLabel(draftFrom || undefined, draftTo || undefined));
    } else {
      return;
    }
    close();
  }

  const canApply =
    activeSection === 'relative' ? hasValidRelativeAmount : activeSection === 'absolute';

  function clearRange(): void {
    setPendingFrom(undefined);
    setPendingTo(undefined);
    setDraftFrom('');
    setDraftTo('');
    setRelativeAmountInput('');
    setLabel('All time');
    setActiveSection(null);
    close();
  }

  // The refresh icon does double duty: apply a pending range that hasn't been pushed to the app
  // yet, or -- if the merchant hasn't actually changed anything -- just re-fetch the current one.
  function handleRefreshClick(): void {
    if (hasPendingChange) {
      onChange({ from: pendingFrom, to: pendingTo });
    } else {
      onRefresh();
    }
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
            className={`${popover.panel} ${styles.rangePanel}`}
            role="dialog"
            aria-label="Select date range"
          >
            <section className={styles.section}>
              <p className={popover.panelHeading}>Quick select</p>
              <div className={styles.relativeRow}>
                <span className={styles.relativeDirectionLabel}>Last</span>
                <label className="visually-hidden" htmlFor="range-amount">
                  Amount
                </label>
                <input
                  id="range-amount"
                  type="number"
                  min={1}
                  placeholder="e.g. 24"
                  className={styles.amountInput}
                  value={relativeAmountInput}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setRelativeAmountInput(event.target.value);
                    setActiveSection('relative');
                  }}
                />
                <label className="visually-hidden" htmlFor="range-unit">
                  Unit
                </label>
                <select
                  id="range-unit"
                  className={styles.unitSelect}
                  value={relativeUnit}
                  onChange={(event) => {
                    setRelativeUnit(event.target.value as RelativeUnit);
                    setActiveSection('relative');
                  }}
                >
                  {RELATIVE_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
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
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setDraftFrom(event.target.value);
                      setActiveSection('absolute');
                    }}
                  />
                </label>
                <span aria-hidden="true">&ndash;</span>
                <label className={styles.absoluteField}>
                  <span className="visually-hidden">End date</span>
                  <input
                    type="date"
                    value={draftTo}
                    min={draftFrom || undefined}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setDraftTo(event.target.value);
                      setActiveSection('absolute');
                    }}
                  />
                </label>
              </div>
            </section>

            <hr className={styles.divider} />

            {/* One shared Apply for both Quick select and Absolute range above -- Commonly used
                applies immediately on click and needs none. `activeSection` says which of the two
                drafts this commits. */}
            <div className={styles.actions}>
              <button type="button" className={buttons.secondary} onClick={clearRange}>
                Clear
              </button>
              <button
                type="button"
                className={buttons.primary}
                onClick={handleApply}
                disabled={!canApply}
                aria-label="Apply selected date range"
              >
                Apply
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`${buttons.icon} ${hasPendingChange ? styles.refreshPending : ''}`}
        aria-label={
          isRefreshing
            ? 'Refreshing reconciliation data'
            : hasPendingChange
              ? 'Apply selected date range'
              : 'Refresh reconciliation data'
        }
        aria-busy={isRefreshing}
        title={hasPendingChange ? 'Apply selected date range' : 'Refresh'}
        onClick={handleRefreshClick}
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
        {/* A small dot flags that a pending range hasn't been applied yet -- clicking this button
            will apply it (and fetch), not just re-fetch the range already showing. */}
        {hasPendingChange && !isRefreshing ? (
          <span className={styles.pendingDot} aria-hidden="true" />
        ) : null}
      </button>
    </div>
  );
}
