import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchSummary } from '../api/reconciliation';
import type { SummaryDto } from '../api/types';

export function useReconciliationSummary(): UseQueryResult<SummaryDto> {
  return useQuery({
    queryKey: ['reconciliation', 'summary'],
    queryFn: fetchSummary,
  });
}
