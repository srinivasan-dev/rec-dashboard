import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchExplanation } from '../api/reconciliation';
import type { ExplanationDto } from '../api/types';

/**
 * Fetches the merchant-facing explanation only once the "AI Explain" tab is actually opened
 * (`enabled`) -- there's no reason to call this for every exception a merchant merely glances
 * at in the table. Backed by Claude (with a deterministic fallback) in apps/api's
 * `explanationService.ts`.
 *
 * `staleTime: Infinity` keeps a transaction's explanation cached for the life of the tab once
 * fetched -- without it, the default staleTime of 0 means the *next* observer for the same
 * transaction (reopening its detail tab, or React 18 StrictMode's dev-only double-mount on first
 * render) sees stale cached data and calls Claude again for the same, unchanging explanation.
 */
export function useExceptionExplanation(
  transactionId: string | null,
  enabled: boolean,
): UseQueryResult<ExplanationDto> {
  return useQuery({
    queryKey: ['reconciliation', 'exception', transactionId, 'explanation'],
    queryFn: () => fetchExplanation(transactionId as string),
    enabled: enabled && transactionId !== null,
    staleTime: Infinity,
  });
}
