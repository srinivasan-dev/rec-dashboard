import type { ExceptionsFilters } from '../api/types';
import { DateRangePicker } from './DateRangePicker';
import { ExportMenu } from './ExportMenu';
import { FilterMenu } from './FilterMenu';
import { SortMenu } from './SortMenu';
import styles from './Toolbar.module.css';

export interface ToolbarProps {
  filters: ExceptionsFilters;
  onChange: (patch: Partial<ExceptionsFilters>) => void;
  onRefresh: () => void;
  /** Whether a refresh is currently in flight -- lets the Refresh button show real feedback
   *  instead of appearing to do nothing (TanStack Query's `isFetching` stays true across a
   *  manual refetch even though `isLoading` doesn't, since the data was already cached). */
  isRefreshing?: boolean;
}

/**
 * The exceptions-table toolbar: a Kibana-style date range picker on the left, and filter/sort/
 * export icon menus on the right (docs/sessions/2026-09-08-epic16-toolbar-redesign.md). Replaces
 * the earlier always-visible reason dropdown + plain date inputs (FilterToolbar.tsx) and the
 * single-format ExportButton.
 */
export function Toolbar({
  filters,
  onChange,
  onRefresh,
  isRefreshing = false,
}: ToolbarProps): JSX.Element {
  return (
    <div className={styles.toolbar} aria-label="Filter, sort, and export exceptions">
      <DateRangePicker
        from={filters.from}
        to={filters.to}
        onChange={({ from, to }) => onChange({ from, to })}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />
      <div className={styles.iconGroup}>
        <FilterMenu reason={filters.reason} onChange={(reason) => onChange({ reason })} />
        <SortMenu sortBy={filters.sortBy} sortOrder={filters.sortOrder} onChange={onChange} />
        <ExportMenu filters={filters} />
      </div>
    </div>
  );
}
