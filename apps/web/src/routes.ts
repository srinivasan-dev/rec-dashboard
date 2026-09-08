/** Icon keys `NavIcon.tsx` knows how to draw -- kept as plain string data here (rather than JSX)
 *  so this module stays framework-render-agnostic, same reasoning as everything else in this
 *  file being plain data. */
export type NavIconName =
  | 'home'
  | 'account'
  | 'collect'
  | 'disburse'
  | 'wallets'
  | 'reconciliation'
  | 'reports'
  | 'settings';

/**
 * Single source of truth for this app's route paths -- AppShell's sidebar links and App.tsx's
 * <Routes> both read from here, so a path can't drift between "where the link points" and
 * "what route actually renders" the way two independently-typed string literals could.
 */
export interface NavItem {
  label: string;
  path: string;
  icon: NavIconName;
}

/** Sidebar items above the active "Reconciliation" entry (docs/design/...Final Design.html order). */
export const NAV_ITEMS_BEFORE_RECONCILIATION: NavItem[] = [
  { label: 'Home', path: '/home', icon: 'home' },
  { label: 'My account', path: '/account', icon: 'account' },
  { label: 'Collect', path: '/collect', icon: 'collect' },
  { label: 'Disburse', path: '/disburse', icon: 'disburse' },
  { label: 'Wallets', path: '/wallets', icon: 'wallets' },
];

/** Sidebar items below the active "Reconciliation" entry. */
export const NAV_ITEMS_AFTER_RECONCILIATION: NavItem[] = [
  { label: 'Reports', path: '/reports', icon: 'reports' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];

/**
 * The reconciliation dashboard's URL includes the merchant id for shareable/bookmarkable links
 * (e.g. /reconciliation/M-104?sortBy=reason) -- but the id is never trusted *from* the URL for
 * anything real; it's always resolved from the authenticated session server-side
 * (docs/architecture.md §4). See ReconciliationRoute.tsx for what happens when they disagree.
 */
export function reconciliationPath(merchantId: string): string {
  return `/reconciliation/${merchantId}`;
}
