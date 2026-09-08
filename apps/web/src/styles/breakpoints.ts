/**
 * Canonical responsive breakpoints -- the JS-side counterpart to the comment block in tokens.css.
 * CSS custom properties can't be read inside `@media` conditions, so every CSS module's `@media`
 * query repeats these numbers as literal px; this file is the one place JS branches on them
 * (table-vs-cards, sidebar rail-vs-drawer, chat column-vs-overlay). Keep both in sync by hand --
 * there's no preprocessor in this repo to share them automatically.
 */
export const BREAKPOINTS = {
  mobileMax: 599,
  tabletPortraitMin: 600,
  tabletPortraitMax: 1023,
  tabletLandscapeMin: 1024,
  tabletLandscapeMax: 1279,
  desktopMin: 1280,
} as const;

export const MEDIA_MOBILE = `(max-width: ${BREAKPOINTS.mobileMax}px)`;
export const MEDIA_TABLET_OR_BELOW = `(max-width: ${BREAKPOINTS.tabletPortraitMax}px)`;
export const MEDIA_DESKTOP = `(min-width: ${BREAKPOINTS.tabletLandscapeMin}px)`;
