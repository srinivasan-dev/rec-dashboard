import { useCallback, useSyncExternalStore } from 'react';

import { MEDIA_MOBILE, MEDIA_TABLET_OR_BELOW } from '../styles/breakpoints';

/**
 * Subscribes to a media query via `window.matchMedia`. `useSyncExternalStore` is the correct
 * primitive for external browser state like this (over `useState`+`useEffect`+listener) -- it
 * keeps the subscription and the read in sync without an extra render-then-correct flicker.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useIsMobile(): boolean {
  return useMediaQuery(MEDIA_MOBILE);
}

/** True at mobile and iPad-portrait widths (<=1023px). docs/product-spec.md §11 says the table
 * becomes stacked cards on "tablet and mobile" widths; this codebase's breakpoint table maps that
 * to <=1023px -- iPad landscape (1024px+) has room for the rail + real table, so it's excluded. */
export function useIsTabletOrBelow(): boolean {
  return useMediaQuery(MEDIA_TABLET_OR_BELOW);
}
