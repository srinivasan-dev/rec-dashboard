import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthSession } from '../hooks/useAuthSession';
import styles from './RequireAuth.module.css';

/**
 * Gates the dashboard route behind a real session (EPIC-15) -- redirects to /login whenever
 * `useAuthSession` fails (no cookie, expired token, or one that fails signature verification).
 * The loading state here is intentionally brief and unstyled beyond basics: on a warm session
 * it resolves almost immediately, and it should never be mistaken for the dashboard's own
 * loading state (see Dashboard.tsx) since it gates a different thing (identity, not data).
 */
export function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  const sessionQuery = useAuthSession();

  if (sessionQuery.isLoading) {
    return (
      <div className={styles.checking} role="status" aria-live="polite">
        Checking your session…
      </div>
    );
  }

  if (sessionQuery.isError) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
