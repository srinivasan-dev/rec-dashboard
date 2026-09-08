import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { logout } from '../api/auth';
import { useReconciliationSummary } from '../hooks/useReconciliationSummary';
import {
  NAV_ITEMS_AFTER_RECONCILIATION,
  NAV_ITEMS_BEFORE_RECONCILIATION,
  reconciliationPath,
} from '../routes';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sidebarToggled } from '../store/uiSlice';
import buttons from '../styles/buttons.module.css';
import styles from './AppShell.module.css';
import { NavIcon } from './NavIcon';

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);
    try {
      await logout();
      // Wipes every cached query (summary, exceptions, explanations, session) -- without this, a
      // different merchant logging in on the same browser tab would briefly see the previous
      // merchant's cached data before their own fetch completed.
      queryClient.clear();
      navigate('/login', { replace: true });
    } catch {
      // Log out is a fire-and-forget-feeling action from the merchant's side, but a failed
      // request (network blip) shouldn't leave the button silently stuck -- let them try again.
      setIsLoggingOut(false);
    }
  }

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <button
          type="button"
          className={styles.collapseToggle}
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

        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            R
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Rapyd</span>
            <span className={styles.brandDivider} aria-hidden="true">
              |
            </span>
            <span className={styles.brandSub}>Client Portal</span>
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
        <div className={styles.topbarEnd}>
          <span className={styles.envPill}>
            <span className={styles.envDot} aria-hidden="true" />
            Production
          </span>

          {merchantId ? (
            <div className={styles.identity}>
              <span className={styles.avatar} aria-hidden="true">
                M
              </span>
              <span className={styles.identityText}>
                <span className={styles.identityName}>Merchant {merchantId}</span>
                <span className={styles.identityRole}>Finance Ops</span>
              </span>
            </div>
          ) : null}

          <button
            type="button"
            className={buttons.secondary}
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </header>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
