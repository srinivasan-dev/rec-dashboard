import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { explainSearch } from '../api/reconciliation';
import type { SearchExplanationDto } from '../api/types';

/**
 * One cache entry per submitted query, same sharing pattern as `useExceptionsSearch` -- if the
 * same query is asked twice (e.g. re-opening an old chat turn), this refetches from cache rather
 * than hitting Claude again. Runs alongside `useExceptionsSearch` for the same query, not instead
 * of it: this hook gets the narrated summary, that one gets the raw matches the chat panel lists
 * underneath it.
 */
export function useSearchExplanation(query: string | null): UseQueryResult<SearchExplanationDto> {
  return useQuery({
    queryKey: ['reconciliation', 'search-explain', query],
    queryFn: () => explainSearch(query as string),
    enabled: !!query,
    retry: false,
  });
}
