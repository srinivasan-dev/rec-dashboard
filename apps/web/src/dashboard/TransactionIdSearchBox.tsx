import { useEffect, useRef, useState } from 'react';

import styles from './TransactionIdSearchBox.module.css';

export interface TransactionIdSearchBoxProps {
  value: string | undefined;
  onChange: (transactionId: string | undefined) => void;
}

const DEBOUNCE_MS = 300;

/**
 * Quick, table-scoped filter by transaction id (Toolbar.tsx) -- a case-insensitive substring
 * match against just the id, server-side (`transactionId` on ExceptionsFilters), distinct from
 * the global AI search bar (GlobalSearchBar) which searches the whole account across id/reason/
 * currency/amounts and opens the chat drawer. Debounced so typing doesn't fire a request per
 * keystroke; local draft state mirrors `value` so clearing the URL filter elsewhere (e.g.
 * searchCleared) is reflected here too.
 */
export function TransactionIdSearchBox({
  value,
  onChange,
}: TransactionIdSearchBoxProps): JSX.Element {
  const [draft, setDraft] = useState(value ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  function handleChange(next: string): void {
    setDraft(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(next.trim() || undefined);
    }, DEBOUNCE_MS);
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon} aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <label className="visually-hidden" htmlFor="transaction-id-search">
        Search by transaction ID
      </label>
      <input
        id="transaction-id-search"
        type="text"
        className={styles.input}
        placeholder="Search transaction ID..."
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
      />
    </div>
  );
}
