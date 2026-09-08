import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { DateRangeFilters } from '../api/reconciliation';
import { fetchSummary } from '../api/reconciliation';
import type { SummaryDto } from '../api/types';

/** `dateRange` is the shared date-range picker's from/to (SearchHero.tsx) -- part of the query
 *  key so switching ranges reads/writes its own cache entry instead of colliding with others. */
export function useReconciliationSummary(
  dateRange: DateRangeFilters = {},
): UseQueryResult<SummaryDto> {
  return useQuery({
    queryKey: ['reconciliation', 'summary', dateRange],
    queryFn: () => fetchSummary(dateRange),
  });
}
