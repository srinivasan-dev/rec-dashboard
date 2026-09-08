import type { ExceptionsFilters, ExportFormat } from '../api/types';
import { buildExportUrl } from '../api/reconciliation';
import buttons from '../styles/buttons.module.css';
import popover from './Popover.module.css';
import { usePopover } from './usePopover';

export interface ExportMenuProps {
  filters: Pick<ExceptionsFilters, 'reason' | 'from' | 'to'> &
    Partial<Pick<ExceptionsFilters, 'sortBy' | 'sortOrder'>>;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'Export as CSV' },
  { value: 'xlsx', label: 'Export as Excel' },
  { value: 'pdf', label: 'Export as PDF' },
];

/**
 * Each option is a plain anchor -- same reasoning as the single-format ExportButton this
 * replaced: the browser's own download handling (Content-Disposition) is simpler and more
 * keyboard-accessible than a fetch+blob button. Available even in the all-clear state
 * (docs/product-spec.md §8) for record-keeping.
 */
export function ExportMenu({ filters }: ExportMenuProps): JSX.Element {
  const { isOpen, toggle, containerRef } = usePopover<HTMLDivElement>();

  return (
    <div className={popover.wrapper} ref={containerRef}>
      <button
        type="button"
        className={buttons.icon}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Export exceptions"
        title="Export"
        onClick={toggle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.5v8m0 0-3-3m3 3 3-3M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className={popover.panel} role="menu" aria-label="Export exceptions">
          {FORMATS.map((format) => (
            <a
              key={format.value}
              role="menuitem"
              className={popover.menuItem}
              href={buildExportUrl(filters, format.value)}
            >
              {format.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
