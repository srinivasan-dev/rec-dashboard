import { Component, type ErrorInfo, type ReactNode } from 'react';

import styles from './ChartErrorBoundary.module.css';

export interface ChartErrorBoundaryProps {
  children: ReactNode;
  /** Shown in the fallback card, e.g. "Matched vs. exceptions" -- so a merchant (and whoever's
   *  debugging) can tell which widget failed without the other two disappearing too. */
  label: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

/**
 * React error boundaries must be class components (no hook equivalent yet) -- this is the one
 * class component in the app, existing purely for that requirement. Wraps each widget-row chart
 * individually (Dashboard.tsx) rather than the whole page: a bug in one D3 widget (see
 * ReconciliationPieChart.tsx's docstring for a real example that crashed the entire app before
 * this existed) now degrades to one small "couldn't render" card instead of taking the whole
 * dashboard down.
 */
export class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  override state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console -- intentional: this is the only place we learn about a
    // render crash outside error-tracking, and there's no other reporting pipeline in this app.
    console.error(`Chart widget "${this.props.label}" crashed:`, error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.fallback} role="alert">
          <p className={styles.title}>{this.props.label}</p>
          <p className={styles.message}>This widget couldn&apos;t be displayed right now.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
