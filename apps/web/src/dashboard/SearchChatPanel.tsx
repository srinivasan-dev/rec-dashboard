import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { useIsTabletOrBelow } from '../hooks/useMediaQuery';
import { useReconciliationSummary } from '../hooks/useReconciliationSummary';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { searchDrawerClosed, searchSubmitted } from '../store/uiSlice';
import { ChatSuggestedPrompts } from './ChatSuggestedPrompts';
import { getChatFollowUpPrompts } from './chatFollowUpPrompts';
import { SearchChatTurn } from './SearchChatTurn';
import styles from './SearchChatPanel.module.css';
import { SUPPORT_TICKET_PROMPT } from './supportTicket';

/** Once a conversation reaches this many turns, the "Create a support ticket" suggestion joins
 *  the regular follow-up chips -- a merchant still going back and forth this far in probably
 *  hasn't gotten what they needed from the chat alone. */
const SUPPORT_PROMPT_THRESHOLD = 3;

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
  const [draft, setDraft] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const isOverlay = useIsTabletOrBelow();
  // Already fetched (and cached) by Dashboard's own useReconciliationSummary -- reusing it here
  // costs no extra request, just the same real exceptionsByReason counts the suggestions below
  // are grounded in.
  const summaryQuery = useReconciliationSummary();
  const suggestedPrompts = useMemo(() => {
    const prompts = getChatFollowUpPrompts(summaryQuery.data, history);
    // Joins the regular follow-ups (not a separate banner) once the conversation has gone on a
    // few turns -- `history.includes` keeps it from piling up a duplicate chip if the merchant
    // has already asked for one ticket and keeps talking.
    if (history.length >= SUPPORT_PROMPT_THRESHOLD && !history.includes(SUPPORT_TICKET_PROMPT)) {
      return [...prompts, SUPPORT_TICKET_PROMPT];
    }
    return prompts;
  }, [summaryQuery.data, history]);

  function close(): void {
    dispatch(searchDrawerClosed());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    dispatch(searchSubmitted(trimmed));
    setDraft('');
  }

  /** Same fill-not-submit behavior as the landing page's SuggestedPrompts for a real question --
   *  picking a follow-up drops it into the composer's draft and focuses the field, the merchant
   *  still sends it. The support-ticket chip is the one exception: it's an action, not a question
   *  to edit first, so picking it submits immediately as its own chat turn (SearchChatTurn.tsx
   *  renders the ticket-confirmation response for it). */
  function selectSuggestedPrompt(prompt: string): void {
    if (prompt === SUPPORT_TICKET_PROMPT) {
      dispatch(searchSubmitted(prompt));
      return;
    }
    setDraft(prompt);
    composerInputRef.current?.focus();
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

  // On mobile/tablet-portrait this panel becomes a full-screen overlay (SearchChatPanel.module.css)
  // -- lock background scroll while it's open so the dashboard behind it doesn't scroll along
  // with a touch drag on the overlay's edges.
  useEffect(() => {
    if (!isOpen || !isOverlay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isOverlay]);

  return (
    <aside
      className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
      aria-hidden={!isOpen}
      aria-label="Ask Reco chat"
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              <span aria-hidden="true">✦</span> Ask Reco
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
              <SearchChatTurn key={`${query}-${index}`} query={query} />
            ))
          )}
        </div>

        <ChatSuggestedPrompts prompts={suggestedPrompts} onSelect={selectSuggestedPrompt} />

        <form className={styles.composer} onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="chat-followup-input">
            Ask a follow-up
          </label>
          <input
            id="chat-followup-input"
            ref={composerInputRef}
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
