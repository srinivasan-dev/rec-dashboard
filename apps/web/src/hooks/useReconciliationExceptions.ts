import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchExceptions } from '../api/reconciliation';
import type { ExceptionsFilters, ExceptionsListResponse } from '../api/types';

export function useReconciliationExceptions(
  filters: ExceptionsFilters,
  enabled = true,
): UseQueryResult<ExceptionsListResponse> {
  return useQuery({
    // The whole filters object is part of the key -- every param this query depends on must be
    // here (see docs/standards/frontend-standards.md "Data fetching"), or a filter change would
    // silently serve a stale cached page.
    queryKey: ['reconciliation', 'exceptions', filters],
    queryFn: () => fetchExceptions(filters),
    // Gate this on the summary having already established there's something to show -- while
    // the summary is loading, or once it's loaded with zero exceptions, there's no reason to
    // fetch a table that won't be rendered.
    enabled,
  });
}
