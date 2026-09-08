import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchExceptionById } from '../api/reconciliation';
import type { ExceptionDto } from '../api/types';

/**
 * Fetches a single exception's full detail independently of whatever page of the exceptions
 * table is currently loaded -- the drawer stays correct even if the merchant changes filters or
 * pages while it's open (the row that opened it may no longer be in the loaded page's data).
 */
export function useReconciliationException(
  transactionId: string | null,
): UseQueryResult<ExceptionDto> {
  return useQuery({
    queryKey: ['reconciliation', 'exception', transactionId],
    queryFn: () => fetchExceptionById(transactionId!),
    enabled: transactionId !== null,
  });
}
