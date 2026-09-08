import { Link } from 'react-router-dom';

import type { ExceptionReason, SummaryDto } from '../api/types';
import { EXCEPTION_LABELS } from '../dashboard/exceptionLabels';
import popover from '../dashboard/Popover.module.css';
import { usePopover } from '../dashboard/usePopover';
import { reconciliationPath } from '../routes';
import styles from './AppShell.module.css';

export interface NotificationsMenuProps {
  summary: SummaryDto | undefined;
}

/**
 * Alerts are derived entirely from `summary` (the same deterministic data StatusBanner and
 * ExceptionBreakdown already show), not a separate feed -- consistent with the "the LLM/UI never
 * invents facts" rule elsewhere in this app. Each line links straight to the reconciliation page
 * pre-filtered to that reason (`?reason=...`, the same URL param FilterMenu/ExceptionBreakdown
 * already use), so clicking an alert takes a merchant directly to the transactions it's about.
 */
export function NotificationsMenu({ summary }: NotificationsMenuProps): JSX.Element {
  const { isOpen, toggle, containerRef } = usePopover<HTMLDivElement>();
  const exceptionCount = summary?.exceptionCount ?? 0;
  const reasonEntries = summary
    ? (Object.entries(summary.exceptionsByReason) as [ExceptionReason, number][]).filter(
        ([, count]) => count > 0,
      )
    : [];

  return (
    <div className={popover.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.notificationsTrigger}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={
          exceptionCount > 0 ? `Notifications, ${exceptionCount} unread` : 'Notifications'
        }
        onClick={toggle}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M14.5 12.5V8.25a5.5 5.5 0 1 0-11 0v4.25L2 14.5h14l-1.5-2Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M7.25 14.5a1.75 1.75 0 0 0 3.5 0"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        {exceptionCount > 0 ? (
          <span className={styles.notificationsBadge} aria-hidden="true">
            {exceptionCount > 9 ? '9+' : exceptionCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={`${popover.panel} ${styles.notificationsPanel}`}
          role="menu"
          aria-label="Notifications"
        >
          <p className={popover.panelHeading}>Alerts</p>

          {!summary || exceptionCount === 0 ? (
            <p className={styles.notificationsEmpty}>
              You&apos;re all caught up — no exceptions need review.
            </p>
          ) : (
            <ul className={styles.notificationsList}>
              <li>
                <Link
                  role="menuitem"
                  className={`${popover.menuItem} ${styles.notificationsMenuItem}`}
                  to={reconciliationPath(summary.merchantId)}
                >
                  <span
                    className={styles.notificationsDot}
                    data-severity="amount"
                    aria-hidden="true"
                  />
                  {exceptionCount} transaction{exceptionCount === 1 ? '' : 's'} need your review
                </Link>
              </li>
              {reasonEntries.map(([reason, count]) => (
                <li key={reason}>
                  <Link
                    role="menuitem"
                    className={`${popover.menuItem} ${styles.notificationsMenuItem}`}
                    to={`${reconciliationPath(summary.merchantId)}?reason=${reason}`}
                  >
                    <span
                      className={styles.notificationsDot}
                      data-severity={EXCEPTION_LABELS[reason].severity}
                      aria-hidden="true"
                    />
                    {count} &middot; {EXCEPTION_LABELS[reason].title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
