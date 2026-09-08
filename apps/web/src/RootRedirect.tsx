import { Navigate } from 'react-router-dom';

import { useAuthSession } from './hooks/useAuthSession';
import { reconciliationPath } from './routes';

/**
 * `/` always forwards to the current merchant's reconciliation URL. Only reachable via
 * RequireAuth (App.tsx), which has already confirmed a valid session exists before this renders,
 * so `sessionQuery.data` is expected to be populated near-instantly from the same cached query.
 */
export function RootRedirect(): JSX.Element | null {
  const sessionQuery = useAuthSession();

  if (!sessionQuery.data) return null;

  return <Navigate to={reconciliationPath(sessionQuery.data.merchantId)} replace />;
}
