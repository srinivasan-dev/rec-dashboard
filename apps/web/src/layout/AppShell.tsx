import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { logout } from '../api/auth';
import { useReconciliationSummary } from '../hooks/useReconciliationSummary';
import {
  NAV_ITEMS_AFTER_RECONCILIATION,
  NAV_ITEMS_BEFORE_RECONCILIATION,
  reconciliationPath,
} from '../routes';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { mobileNavClosed, mobileNavOpened, sidebarToggled } from '../store/uiSlice';
import buttons from '../styles/buttons.module.css';
import styles from './AppShell.module.css';
import { LanguageMenu } from './LanguageMenu';
import { NavIcon } from './NavIcon';
import { NotificationsMenu } from './NotificationsMenu';
import { ToastContainer } from './ToastContainer';
import { UserMenu } from './UserMenu';

/**
 * Static portal chrome from docs/design/Rapyd Settlement Reconciliation Final Design -
 * Interactive Prototype.html -- this app is one feature (Reconciliation) inside a larger client
 * portal, so the sidebar/topbar represent that context. Every other nav item now points at a
 * real route (routes.ts) rendering the shared `ComingSoon` placeholder (App.tsx) -- previously
 * they were plain, non-interactive text specifically to avoid a link that goes nowhere (a real
 * accessibility concern, docs/product-spec.md §12); now that each has a destination, they're
 * real links.
 */
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const summaryQuery = useReconciliationSummary();
  const merchantId = summaryQuery.data?.merchantId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const mobileNavOpen = useAppSelector((state) => state.ui.mobileNavOpen);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  // The page title used to live inside Dashboard.tsx's own header; it's shared chrome now, so it
  // only applies while that page is actually showing -- other routes (Home, Collect, ...) render
  // the generic ComingSoon placeholder and shouldn't claim "Settlement Reconciliation" as theirs.
  const isReconciliationRoute = location.pathname.startsWith('/reconciliation');

  // Closes the mobile drawer automatically once a nav link is followed -- a merchant tapping a
  // section shouldn't also have to dismiss the drawer as a separate step.
  useEffect(() => {
    dispatch(mobileNavClosed());
  }, [location.pathname, dispatch]);

  // Fallback for the brief window before the session/summary query resolves a merchantId --
  // UserMenu needs one to render the identity it hangs its dropdown off of, but a merchant must
  // always be able to log out, even mid-load. Once merchantId is known, UserMenu (below) takes
  // over and owns this same logout flow itself.
  async function handleFallbackLogout(): Promise<void> {
    setIsLoggingOut(true);
    try {
      await logout();
      queryClient.clear();
      navigate('/login', { replace: true });
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
      {mobileNavOpen ? (
        <div
          className={styles.scrim}
          onClick={() => dispatch(mobileNavClosed())}
          aria-hidden="true"
        />
      ) : null}
      {/* Sits on the corner where the sidebar's right edge meets the header's bottom edge --
          a sibling of both rather than a child of either, since `.sidebar`'s `overflow: hidden`
          (needed for the label-collapse animation) would otherwise clip it as it straddles that
          border. Its `left` offset tracks `.shell`'s own grid-template-columns transition, so it
          slides in step with the sidebar instead of jumping. */}
      <button
        type="button"
        className={`${styles.collapseToggle} ${collapsed ? styles.collapseToggleCollapsed : ''}`}
        onClick={() => dispatch(sidebarToggled())}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        <svg
          className={styles.collapseToggleIcon}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M9 2 4 7l5 5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${mobileNavOpen ? styles.sidebarMobileOpen : ''}`}
      >
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            R
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Rapyd</span>
          </span>
        </div>

        <nav aria-label="Client portal sections">
          <ul className={styles.nav}>
            {NAV_ITEMS_BEFORE_RECONCILIATION.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? styles.navItemActive : styles.navItem)}
                  title={item.label}
                >
                  <NavIcon name={item.icon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink
                to={merchantId ? reconciliationPath(merchantId) : '/'}
                className={({ isActive }) => (isActive ? styles.navItemActive : styles.navItem)}
                title="Reconciliation"
              >
                <NavIcon name="reconciliation" />
                <span className={styles.navLabel}>Reconciliation</span>
              </NavLink>
            </li>
            {NAV_ITEMS_AFTER_RECONCILIATION.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? styles.navItemActive : styles.navItem)}
                  title={item.label}
                >
                  <NavIcon name={item.icon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.mobileNavToggle}
          onClick={() => dispatch(mobileNavOpened())}
          aria-label="Open navigation menu"
          aria-expanded={mobileNavOpen}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 4h12M2 8h12M2 12h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {isReconciliationRoute ? (
          <div className={styles.pageTitle}>
            <h1 className={styles.pageTitleName}>Settlement Reconciliation</h1>
            {merchantId ? <p className={styles.pageTitleSub}>Merchant {merchantId}</p> : null}
          </div>
        ) : null}

        <div className={styles.topbarEnd}>
          <span className={styles.envPill}>
            <span className={styles.envDot} aria-hidden="true" />
            Production
          </span>

          <LanguageMenu />

          <NotificationsMenu summary={summaryQuery.data} />

          {merchantId ? (
            <UserMenu merchantId={merchantId} />
          ) : (
            <button
              type="button"
              className={buttons.secondary}
              onClick={() => void handleFallbackLogout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out…' : 'Log out'}
            </button>
          )}
        </div>
      </header>

      <div className={styles.content}>{children}</div>

      <ToastContainer />
    </div>
  );
}
