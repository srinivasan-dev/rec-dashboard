import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { logout } from '../api/auth';
import popover from '../dashboard/Popover.module.css';
import { usePopover } from '../dashboard/usePopover';
import styles from './AppShell.module.css';

export interface UserMenuProps {
  merchantId: string;
}

/**
 * Replaces the old always-visible "Log out" button with a disclosure under the merchant identity
 * -- same `usePopover`/`Popover.module.css` pattern as the dashboard's Filter/Sort/Export menus,
 * so it dismisses on Escape/outside-click the same way every other menu in the app does.
 */
export function UserMenu({ merchantId }: UserMenuProps): JSX.Element {
  const { isOpen, toggle, close, containerRef } = usePopover<HTMLDivElement>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      close();
    }
  }

  return (
    <div className={popover.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.userMenuTrigger}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Account menu for Merchant ${merchantId}`}
        onClick={toggle}
      >
        <span className={styles.avatar} aria-hidden="true">
          M
        </span>
        <span className={styles.identityText}>
          <span className={styles.identityName}>Merchant {merchantId}</span>
          <span className={styles.identityRole}>Finance Ops</span>
        </span>
        <svg
          className={`${styles.userMenuChevron} ${isOpen ? styles.userMenuChevronOpen : ''}`}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 3.5 5 6.5 8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className={popover.panel} role="menu" aria-label="Account menu">
          <button
            type="button"
            role="menuitem"
            className={`${popover.menuItem} ${styles.logoutMenuItem}`}
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M5.5 1.5H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M9.5 9.5 12.5 7l-3-2.5M12.5 7H5.25"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isLoggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
