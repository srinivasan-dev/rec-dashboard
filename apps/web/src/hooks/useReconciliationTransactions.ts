import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchTransactions } from '../api/reconciliation';
import type { ExceptionsFilters, TransactionsListResponse } from '../api/types';

/** Same as `useReconciliationExceptions`, but every checked transaction (matched + exceptions) --
 *  backs Toolbar.tsx's "show matched transactions" checkbox. */
export function useReconciliationTransactions(
  filters: ExceptionsFilters,
  enabled = true,
): UseQueryResult<TransactionsListResponse> {
  return useQuery({
    queryKey: ['reconciliation', 'transactions', filters],
    queryFn: () => fetchTransactions(filters),
    enabled,
  });
}
