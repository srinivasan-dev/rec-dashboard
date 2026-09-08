import type { ExceptionsFilters, SummaryDto } from '../api/types';
import { GlobalSearchBar } from '../layout/GlobalSearchBar';
import { useAppSelector } from '../store/hooks';
import { DateRangePicker } from './DateRangePicker';
import styles from './SearchHero.module.css';
import { StatusBanner } from './StatusBanner';
import { SuggestedPrompts } from './SuggestedPrompts';

export interface SearchHeroProps {
  summary: SummaryDto;
  filters: ExceptionsFilters;
  onFiltersChange: (patch: Partial<ExceptionsFilters>) => void;
  onRefresh: () => void;
  /** Whether a refresh is currently in flight -- lets the Refresh button show real feedback
   *  instead of appearing to do nothing (TanStack Query's `isFetching` stays true across a
   *  manual refetch even though `isLoading` doesn't, since the data was already cached). */
  isRefreshing?: boolean;
}

/**
 * The search bar's new home -- centered, where the page title + status banner used to sit in
 * Dashboard's own header (the title moved into AppShell's shared topbar instead; see
 * AppShell.tsx's `.pageTitle`). Order top to bottom: search bar, suggested prompts (a running
 * start for a merchant unsure what to ask), then the status banner with the date range picker to
 * its right -- moved here from Toolbar.tsx because the range now drives the widget charts above
 * (via Dashboard.tsx's `useReconciliationSummary(dateRange)`/`useCurrencyTotals(dateRange)`) as
 * well as the exceptions table, not just the table, so it belongs somewhere both can see it
 * rather than scoped to the table's own toolbar.
 *
 * Toggles with the chat drawer (SearchChatPanel) rather than coexisting with it -- once a merchant
 * is mid-conversation the landing search/prompts/status block is redundant screen space, so it
 * smoothly collapses out (a CSS grid-rows 0fr<->1fr tween, which animates "auto" height without
 * JS-measured pixel heights) while the drawer is open, and returns when it closes. Still mounted
 * (not conditionally rendered) so the collapse itself can animate rather than popping.
 */
export function SearchHero({
  summary,
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing = false,
}: SearchHeroProps): JSX.Element {
  const chatOpen = useAppSelector((state) => state.ui.search.drawerOpen);

  return (
    <div
      className={`${styles.collapse} ${chatOpen ? styles.collapseClosed : ''}`}
      aria-hidden={chatOpen}
    >
      <div className={styles.collapseInner}>
        <div className={styles.hero}>
          <div className={styles.searchWrap}>
            <GlobalSearchBar />
          </div>
          <SuggestedPrompts />
          <div className={styles.statusWrap}>
            <StatusBanner
              totalChecked={summary.totalChecked}
              matchedCount={summary.matchedCount}
              exceptionCount={summary.exceptionCount}
            />
            <DateRangePicker
              from={filters.from}
              to={filters.to}
              onChange={({ from, to }) => onFiltersChange({ from, to })}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
