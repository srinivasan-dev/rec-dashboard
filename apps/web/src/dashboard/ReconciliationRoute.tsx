import { Navigate, useLocation, useParams } from 'react-router-dom';

import { useAuthSession } from '../hooks/useAuthSession';
import { reconciliationPath } from '../routes';
import { Dashboard } from './Dashboard';

/**
 * The `:merchantId` URL segment is never trusted for data access -- every request is still scoped
 * server-side by the session (docs/architecture.md §4); this only keeps the *displayed* URL
 * honest. If it doesn't match the session's real merchant (a stale bookmark, a manually edited
 * URL, someone else's shared link), redirect to the correct one rather than rendering a dashboard
 * whose address bar lies about whose data is on screen -- preserving the query string (filters,
 * sort) since only the merchant segment was wrong.
 */
export function ReconciliationRoute(): JSX.Element | null {
  const { merchantId } = useParams<{ merchantId: string }>();
  const location = useLocation();
  const sessionQuery = useAuthSession();

  if (sessionQuery.data && sessionQuery.data.merchantId !== merchantId) {
    return (
      <Navigate
        to={`${reconciliationPath(sessionQuery.data.merchantId)}${location.search}`}
        replace
      />
    );
  }

  return <Dashboard />;
}
