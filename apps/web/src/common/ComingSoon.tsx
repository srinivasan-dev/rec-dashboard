import { Link } from 'react-router-dom';

import buttons from '../styles/buttons.module.css';
import styles from './ComingSoon.module.css';

export interface ComingSoonProps {
  title: string;
  backTo: string;
  backLabel: string;
}

/**
 * Shared placeholder for every sidebar section that isn't built yet (docs/product-spec.md never
 * scoped these -- see AppShell.tsx). Previously these nav items rendered as plain non-interactive
 * text specifically to avoid a link that goes nowhere (a real accessibility concern, §12); now
 * that each one has a real destination, this page *is* the destination -- a calm, on-brand "not
 * built yet" state rather than a broken link or a blank screen.
 */
export function ComingSoon({ title, backTo, backLabel }: ComingSoonProps): JSX.Element {
  return (
    <main className={styles.page}>
      <div className={styles.illustration} aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none" className={styles.svg}>
          <circle cx="60" cy="60" r="56" className={styles.ring} />
          <g className={styles.gearGroup}>
            <path
              className={styles.gear}
              d="M60 34a26 26 0 1 0 0 52 26 26 0 0 0 0-52Zm0 8a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z"
            />
            <path
              className={styles.gearTeeth}
              d="M60 20v8M60 92v8M100 60h-8M28 60h-8M87.2 32.8l-5.6 5.6M38.4 81.6l-5.6 5.6M87.2 87.2l-5.6-5.6M38.4 38.4l-5.6-5.6"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <circle className={styles.dot} cx="60" cy="60" r="6" />
        </svg>
      </div>

      <h1 className={styles.heading}>{title}</h1>
      <p className={styles.subheading}>
        This part of the client portal is still being built. Check back soon.
      </p>

      <Link to={backTo} className={buttons.primary}>
        {backLabel}
      </Link>
    </main>
  );
}
