import type { NavIconName } from '../routes';

export interface NavIconProps {
  name: NavIconName;
}

const STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * One small (18x18) line icon per sidebar item, used by both the expanded (icon + label) and
 * collapsed (icon only) states of AppShell's sidebar -- kept as one component/lookup rather than
 * inlining SVGs at each call site, since the icon set is fixed and shared between both renders of
 * the nav list.
 */
export function NavIcon({ name }: NavIconProps): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...STROKE_PROPS}>
      {ICON_PATHS[name]}
    </svg>
  );
}

const ICON_PATHS: Record<NavIconName, JSX.Element> = {
  home: <path d="M2.5 8.5 9 3l6.5 5.5V15a1 1 0 0 1-1 1h-3v-4.5h-5V16h-3a1 1 0 0 1-1-1z" />,
  account: (
    <>
      <circle cx="9" cy="6" r="2.75" />
      <path d="M3 15c0-2.9 2.7-5 6-5s6 2.1 6 5" />
    </>
  ),
  collect: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M9 5.5V11M6.5 8.5 9 11l2.5-2.5" />
    </>
  ),
  disburse: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M9 12.5V7M6.5 9.5 9 7l2.5 2.5" />
    </>
  ),
  wallets: (
    <>
      <rect x="2.5" y="5" width="13" height="9" rx="1.5" />
      <path d="M2.5 7.5h13" />
      <circle cx="12.5" cy="10.5" r="1" />
    </>
  ),
  reconciliation: (
    <>
      <rect x="3" y="2.5" width="12" height="13" rx="1.5" />
      <path d="M6 8.5 8 10.5 12 6.5M6 12.5h6" />
    </>
  ),
  reports: (
    <>
      <path d="M4 15V9.5M9 15V3.5M14 15v-7" />
      <path d="M2.5 15.5h13" />
    </>
  ),
  settings: (
    <>
      <circle cx="9" cy="9" r="2.25" />
      <path d="M9 2.5v1.6M9 13.9v1.6M15.5 9h-1.6M4.1 9H2.5M13.3 4.7l-1.1 1.1M5.8 12.2l-1.1 1.1M13.3 13.3l-1.1-1.1M5.8 5.8 4.7 4.7" />
    </>
  ),
};
