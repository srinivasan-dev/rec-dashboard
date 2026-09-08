import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { ComingSoon } from './common/ComingSoon';
import { ReconciliationRoute } from './dashboard/ReconciliationRoute';
import { useAuthSession } from './hooks/useAuthSession';
import { AppShell } from './layout/AppShell';
import { GlobalLoadingBar } from './layout/GlobalLoadingBar';
import { RootRedirect } from './RootRedirect';
import {
  NAV_ITEMS_AFTER_RECONCILIATION,
  NAV_ITEMS_BEFORE_RECONCILIATION,
  reconciliationPath,
} from './routes';

const PLACEHOLDER_NAV_ITEMS = [
  ...NAV_ITEMS_BEFORE_RECONCILIATION,
  ...NAV_ITEMS_AFTER_RECONCILIATION,
];

/**
 * EPIC-15's routing: /login is public, everything else requires a real session
 * (RequireAuth -> useAuthSession -> GET /api/auth/session). The reconciliation dashboard lives at
 * /reconciliation/:merchantId (see routes.ts and ReconciliationRoute.tsx) rather than at `/`, so
 * a URL like /reconciliation/M-104?sortBy=reason is a real, shareable, bookmarkable link to one
 * merchant's filtered view -- `/` itself just forwards to it (RootRedirect.tsx). Every other
 * sidebar item (AppShell.tsx) now points at a real route rendering the shared `ComingSoon`
 * placeholder, since a nav link with no destination fails the keyboard/screen-reader navigation
 * commitment in docs/product-spec.md §12 as surely as a missing label would.
 */
export function App(): JSX.Element {
  return (
    <>
      {/* Mounted once, above every route (including /login) -- see GlobalLoadingBar's own
          docstring for why one component here covers the whole app's backend activity without
          per-page wiring. */}
      <GlobalLoadingBar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <RootRedirect />
            </RequireAuth>
          }
        />
        <Route
          path="/reconciliation/:merchantId"
          element={
            <RequireAuth>
              <AppShell>
                <ReconciliationRoute />
              </AppShell>
            </RequireAuth>
          }
        />
        {PLACEHOLDER_NAV_ITEMS.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={
              <RequireAuth>
                <AppShell>
                  <ComingSoonForCurrentMerchant title={item.label} />
                </AppShell>
              </RequireAuth>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/**
 * The placeholder's "back to Reconciliation" link needs the current merchant id to build a real
 * `/reconciliation/:merchantId` URL -- resolved here (the session is already cached by the
 * surrounding RequireAuth) rather than inside `ComingSoon` itself, keeping that component free of
 * any auth/session dependency. Falls back to `/` (which itself resolves via RootRedirect) on the
 * rare render where the session hasn't populated yet.
 */
function ComingSoonForCurrentMerchant({ title }: { title: string }): JSX.Element {
  const sessionQuery = useAuthSession();
  const backTo = sessionQuery.data ? reconciliationPath(sessionQuery.data.merchantId) : '/';

  return <ComingSoon title={title} backLabel="Back to Reconciliation" backTo={backTo} />;
}
