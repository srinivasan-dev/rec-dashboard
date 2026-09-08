import type { ChangeEvent } from 'react';

import type { ExceptionReason } from '../api/types';
import buttons from '../styles/buttons.module.css';
import { EXCEPTION_LABELS } from './exceptionLabels';
import popover from './Popover.module.css';
import { usePopover } from './usePopover';

export interface FilterMenuProps {
  reason: ExceptionReason | undefined;
  onChange: (reason: ExceptionReason | undefined) => void;
}

const REASONS = Object.keys(EXCEPTION_LABELS) as ExceptionReason[];

/**
 * The Reason filter, behind an icon button rather than always visible in the toolbar row --
 * the exception breakdown pills (ExceptionBreakdown.tsx) cover the common case of picking one
 * reason with a single click; this menu is the same underlying filter for anyone who reaches
 * for the toolbar instead of the pills. Both write to the same `reason` URL filter.
 */
export function FilterMenu({ reason, onChange }: FilterMenuProps): JSX.Element {
  const { isOpen, toggle, containerRef } = usePopover<HTMLDivElement>();

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const value = event.target.value;
    onChange(value ? (value as ExceptionReason) : undefined);
  }

  return (
    <div className={popover.wrapper} ref={containerRef}>
      <button
        type="button"
        className={buttons.icon}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Filter exceptions"
        title="Filter"
        onClick={toggle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 3h12M4.5 8h7M7 13h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className={popover.panel} role="dialog" aria-label="Filter exceptions">
          <div className={popover.panelHeading}>
            <label htmlFor="exceptions-reason-filter">Reason</label>
          </div>
          <select id="exceptions-reason-filter" value={reason ?? ''} onChange={handleChange}>
            <option value="">All types</option>
            {REASONS.map((value) => (
              <option key={value} value={value}>
                {EXCEPTION_LABELS[value].title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
