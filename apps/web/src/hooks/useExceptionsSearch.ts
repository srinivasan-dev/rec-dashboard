import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { searchExceptions } from '../api/reconciliation';
import type { SearchResultDto } from '../api/types';

/**
 * Backs both the search chat panel and the main table's "search mode" (Dashboard.tsx) -- one
 * query, one fetch, both surfaces reading the same result set (including `matchType`, so a vague
 * query that fell back to the full exception set renders identically in both places) so they can
 * never disagree.
 */
export function useExceptionsSearch(query: string | null): UseQueryResult<SearchResultDto> {
  return useQuery({
    queryKey: ['reconciliation', 'search', query],
    queryFn: () => searchExceptions(query!),
    enabled: !!query,
  });
}
