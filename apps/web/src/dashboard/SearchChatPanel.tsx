import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthSession } from '../hooks/useAuthSession';
import { reconciliationPath } from '../routes';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { rowExpanded, searchDrawerClosed, searchSubmitted } from '../store/uiSlice';
import { SearchChatTurn } from './SearchChatTurn';
import styles from './SearchChatPanel.module.css';

/**
 * The 30% chat companion to the reconciliation table's 70% (Dashboard.module.css's
 * `.splitLayout`/`.pageCompact`). Replaces the earlier modal `SearchDrawer` -- this renders
 * in-flow beside the table rather than as a fixed overlay, so it can participate in the
 * side-by-side split instead of covering the page. Always mounted (even closed, at zero width)
 * so opening/closing animates the split rather than popping content in after the fact.
 *
 * Each submitted query becomes one entry in `ui.search.history` and one `SearchChatTurn` here --
 * a real chat transcript, not a single-result view, so follow-up questions stack rather than
 * replacing what came before.
 */
export function SearchChatPanel(): JSX.Element {
  const isOpen = useAppSelector((state) => state.ui.search.drawerOpen);
  const history = useAppSelector((state) => state.ui.search.history);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const sessionQuery = useAuthSession();
  const [draft, setDraft] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  function close(): void {
    dispatch(searchDrawerClosed());
  }

  /** Same reasoning as the old SearchDrawer's jumpToRow: the search bar is reachable from any
   *  page, so jumping to a result must navigate to the reconciliation route first, not assume
   *  the merchant is already looking at it. */
  function jumpToRow(transactionId: string): void {
    dispatch(rowExpanded(transactionId));
    close();
    if (sessionQuery.data) {
      navigate(reconciliationPath(sessionQuery.data.merchantId));
    }
    window.setTimeout(() => {
      document
        .getElementById(`exception-row-${transactionId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    dispatch(searchSubmitted(trimmed));
    setDraft('');
  }

  useEffect(() => {
    const body = bodyRef.current;
    // `Element.scrollTo` isn't implemented in jsdom (the test environment) -- guarded rather than
    // assumed, since throwing here would break every test that mounts this panel, not just ones
    // that exercise scrolling.
    if (body && typeof body.scrollTo === 'function') {
      body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    }
  }, [history.length]);

  return (
    <aside
      className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
      aria-hidden={!isOpen}
      aria-label="Search chat"
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              <span aria-hidden="true">✦</span> Ask about your exceptions
            </h2>
            <p className={styles.subtitle}>AI summaries grounded in your reconciliation data.</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={close}
            tabIndex={isOpen ? 0 : -1}
          >
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">Close</span>
          </button>
        </div>

        <div className={styles.body} ref={bodyRef}>
          {history.length === 0 ? (
            <p className={styles.empty}>Search above, or ask a follow-up here.</p>
          ) : (
            history.map((query, index) => (
              <SearchChatTurn key={`${query}-${index}`} query={query} onJumpToRow={jumpToRow} />
            ))
          )}
        </div>

        <form className={styles.composer} onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="chat-followup-input">
            Ask a follow-up
          </label>
          <input
            id="chat-followup-input"
            type="text"
            className={styles.composerInput}
            placeholder="Ask a follow-up..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            tabIndex={isOpen ? 0 : -1}
          />
          <button
            type="submit"
            className={styles.composerSend}
            disabled={!draft.trim()}
            tabIndex={isOpen ? 0 : -1}
          >
            <span aria-hidden="true">→</span>
            <span className="visually-hidden">Send</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
