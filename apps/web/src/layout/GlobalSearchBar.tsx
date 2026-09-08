import { useState, type FormEvent } from 'react';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { searchSubmitted } from '../store/uiSlice';
import styles from './GlobalSearchBar.module.css';

/**
 * Top-level global search (docs/sessions/2026-09-08-epic17-search-and-inline-detail.md) --
 * chat-input styled (rounded pill, trailing send button) rather than a typical filter field, per
 * the request. Deliberately submit-on-Enter/click, not live-as-you-type: this searches the
 * merchant's entire exception set on the server (see SearchDrawer.tsx / Dashboard.tsx's search
 * mode), so firing it on every keystroke would mean a request per character for no benefit --
 * nothing here needs live suggestions the way a type-ahead would.
 */
export function GlobalSearchBar(): JSX.Element {
  const dispatch = useAppDispatch();
  const activeQuery = useAppSelector((state) => state.ui.search.query);
  const [draft, setDraft] = useState(activeQuery ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    dispatch(searchSubmitted(trimmed));
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search">
      <label className="visually-hidden" htmlFor="global-search-input">
        Search exceptions by transaction ID, reason, currency, or amount
      </label>
      <span className={styles.icon} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        id="global-search-input"
        type="text"
        className={styles.input}
        placeholder="Search transaction ID, reason, currency, or amount..."
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="submit" className={styles.sendButton} disabled={!draft.trim()}>
        <span aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8h11M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="visually-hidden">Search</span>
      </button>
    </form>
  );
}
