import { useIsFetching, useIsMutating } from '@tanstack/react-query';

import styles from './GlobalLoadingBar.module.css';

/**
 * A single, app-wide indicator for "the app is talking to the server right now" -- initial page
 * load, a filter change, the manual refresh button, a background refetch, anything. `useIsFetching`/
 * `useIsMutating` count in-flight TanStack Query activity across the *entire* QueryClient (no
 * `queryKey` filter passed), so this needs zero per-call wiring: every existing and future
 * `useQuery`/`useMutation` in the app is covered automatically just by this component existing,
 * mounted once here in AppShell.
 *
 * Deliberately a slim top-of-viewport progress bar (YouTube/GitHub-style) rather than a blocking
 * overlay/spinner -- this app already has per-widget skeleton states (Dashboard.tsx's
 * `.skeletonRow`/`.skeletonTable`) for the "nothing to show yet" case; this bar's job is just the
 * ambient "something is loading somewhere" signal for background refetches too, without blocking
 * interaction with data that's already on screen.
 */
export function GlobalLoadingBar(): JSX.Element | null {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isActive = isFetching > 0 || isMutating > 0;

  if (!isActive) return null;

  return (
    <div className={styles.track} role="status" aria-live="polite">
      <span className="visually-hidden">Loading…</span>
      <div className={styles.bar} />
    </div>
  );
}
