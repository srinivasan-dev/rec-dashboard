import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchExplanation } from '../api/reconciliation';
import type { ExplanationDto } from '../api/types';

/**
 * Fetches the merchant-facing explanation only once the "AI Explain" tab is actually opened
 * (`enabled`) -- there's no reason to call this for every exception a merchant merely glances
 * at in the table. See docs/ai-design.md (Phase 8) for what generates this text; today it's
 * apps/api's deterministic stub, tomorrow a real provider behind the same response shape.
 */
export function useExceptionExplanation(
  transactionId: string | null,
  enabled: boolean,
): UseQueryResult<ExplanationDto> {
  return useQuery({
    queryKey: ['reconciliation', 'exception', transactionId, 'explanation'],
    queryFn: () => fetchExplanation(transactionId as string),
    enabled: enabled && transactionId !== null,
  });
}
