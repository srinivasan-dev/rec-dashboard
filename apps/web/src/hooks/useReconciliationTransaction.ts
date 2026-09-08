import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchTransactionById } from '../api/reconciliation';
import type { TransactionDto } from '../api/types';

/** Same as `useReconciliationException`, but resolves either a matched transaction or an
 *  exception by id -- used by ExceptionDetailPanel.tsx once a row can be either. */
export function useReconciliationTransaction(
  transactionId: string | null,
): UseQueryResult<TransactionDto> {
  return useQuery({
    queryKey: ['reconciliation', 'transaction', transactionId],
    queryFn: () => fetchTransactionById(transactionId!),
    enabled: transactionId !== null,
  });
}
