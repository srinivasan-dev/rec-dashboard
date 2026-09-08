import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { DateRangeFilters } from '../api/reconciliation';
import { fetchCurrencyTotals } from '../api/reconciliation';
import type { CurrencyTotalsDto } from '../api/types';

/** `dateRange` is the shared date-range picker's from/to (SearchHero.tsx). */
export function useCurrencyTotals(
  dateRange: DateRangeFilters = {},
): UseQueryResult<CurrencyTotalsDto[]> {
  return useQuery({
    queryKey: ['reconciliation', 'summary', 'currency-totals', dateRange],
    queryFn: () => fetchCurrencyTotals(dateRange),
  });
}
