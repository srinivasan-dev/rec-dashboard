import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toastDismissed } from '../store/uiSlice';
import styles from './ToastContainer.module.css';

const AUTO_DISMISS_MS = 5000;

/**
 * Renders `state.ui.toasts` (uiSlice.ts's `toastShown`/`toastDismissed` -- previously scaffolded
 * but never actually displayed anywhere). Mounted once in AppShell so any feature can dispatch
 * `toastShown` and have it appear regardless of which route/panel triggered it, instead of every
 * caller needing its own toast UI.
 */
export function ToastContainer(): JSX.Element | null {
  const toasts = useAppSelector((state) => state.ui.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack} aria-live="polite" role="status">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} message={toast.message} tone={toast.tone} />
      ))}
    </div>
  );
}

function ToastItem({
  id,
  message,
  tone,
}: {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}): JSX.Element {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(toastDismissed(id)), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, dispatch]);

  return (
    <div className={styles.toast} data-tone={tone}>
      <span className={styles.message}>{message}</span>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => dispatch(toastDismissed(id))}
        aria-label="Dismiss notification"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
