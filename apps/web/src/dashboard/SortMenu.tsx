import type { SortBy, SortOrder } from '../api/types';
import buttons from '../styles/buttons.module.css';
import popover from './Popover.module.css';
import { usePopover } from './usePopover';

export interface SortMenuProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onChange: (patch: { sortBy: SortBy; sortOrder: SortOrder }) => void;
}

const SORT_FIELDS: { value: SortBy; label: string }[] = [
  { value: 'transactionDate', label: 'Date' },
  { value: 'transactionId', label: 'Transaction' },
  { value: 'reason', label: 'Reason' },
  { value: 'differenceAmount', label: 'Difference' },
];

const SORT_ORDERS: { value: SortOrder; label: string }[] = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

/**
 * A toolbar-level alternative to clicking a sortable table header (ExceptionsTable.tsx) -- same
 * underlying `sortBy`/`sortOrder` URL state, just reachable without scrolling to the table.
 */
export function SortMenu({ sortBy, sortOrder, onChange }: SortMenuProps): JSX.Element {
  const { isOpen, toggle, containerRef } = usePopover<HTMLDivElement>();

  return (
    <div className={popover.wrapper} ref={containerRef}>
      <button
        type="button"
        className={buttons.icon}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Sort exceptions"
        title="Sort"
        onClick={toggle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M4 3v10M4 13l-2.5-2.5M4 13l2.5-2.5M12 13V3M12 3l2.5 2.5M12 3l-2.5 2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className={popover.panel} role="dialog" aria-label="Sort exceptions">
          <fieldset className={popover.radioGroup}>
            <legend className={popover.panelHeading}>Sort by</legend>
            {SORT_FIELDS.map((field) => (
              <label key={field.value} className={popover.radioOption}>
                <input
                  type="radio"
                  name="sort-by"
                  value={field.value}
                  checked={sortBy === field.value}
                  onChange={() => onChange({ sortBy: field.value, sortOrder })}
                />
                {field.label}
              </label>
            ))}
          </fieldset>

          <fieldset className={popover.radioGroup}>
            <legend className={popover.panelHeading}>Order</legend>
            {SORT_ORDERS.map((order) => (
              <label key={order.value} className={popover.radioOption}>
                <input
                  type="radio"
                  name="sort-order"
                  value={order.value}
                  checked={sortOrder === order.value}
                  onChange={() => onChange({ sortBy, sortOrder: order.value })}
                />
                {order.label}
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
