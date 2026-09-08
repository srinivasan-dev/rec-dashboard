import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchSession, type SessionDto } from '../api/auth';

/**
 * "Am I logged in" as a query rather than component state -- a 401 here is an expected, common
 * outcome (not logged in yet), not a transient failure, so `retry: false` (unlike most queries
 * in this app, which retry once by default -- see main.tsx's QueryClient defaults).
 */
export function useAuthSession(): UseQueryResult<SessionDto> {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: fetchSession,
    retry: false,
  });
}
