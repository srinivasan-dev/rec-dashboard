import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { explainSearch } from '../api/reconciliation';
import type { SearchExplanationDto } from '../api/types';

/**
 * One cache entry per submitted query, same sharing pattern as `useExceptionsSearch` -- if the
 * same query is asked twice (e.g. re-opening an old chat turn), this reads from cache rather
 * than hitting Claude again. Runs alongside `useExceptionsSearch` for the same query, not instead
 * of it: this hook gets the narrated summary, that one gets the raw matches the chat panel lists
 * underneath it.
 *
 * `staleTime: Infinity` is what actually makes "reads from cache" true: the default staleTime is
 * 0, which marks cached data stale the instant it lands, so the *next* observer for the same
 * queryKey -- another SearchChatTurn mounting, or React 18 StrictMode's dev-only double-mount on
 * first render -- triggers `refetchOnMount` and calls Claude again for a question already
 * answered. A query's answer for fixed reconciliation data never goes stale on its own, so this
 * query is cached for the life of the tab (cleared only by a full reload, or a client-side
 * `queryClient.clear()`, e.g. on logout).
 */
export function useSearchExplanation(query: string | null): UseQueryResult<SearchExplanationDto> {
  return useQuery({
    queryKey: ['reconciliation', 'search-explain', query],
    queryFn: () => explainSearch(query as string),
    enabled: !!query,
    retry: false,
    staleTime: Infinity,
  });
}
