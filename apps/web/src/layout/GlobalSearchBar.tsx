import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { searchDraftConsumed, searchSubmitted } from '../store/uiSlice';
import styles from './GlobalSearchBar.module.css';

const STATIC_PLACEHOLDER = 'Search transaction ID, reason, currency, or amount...';

/** Cycled by the typewriter placeholder below while the field is empty -- a mix of literal
 *  (transaction id / reason keyword) and natural-language example queries, so the animation
 *  itself teaches merchants both ways this search understands them. */
const PLACEHOLDER_PROMPTS = [
  STATIC_PLACEHOLDER,
  'Why is my money not showing up?',
  'Show me duplicate entries',
  'Which transactions need review?',
];

const TYPE_MS = 45;
const DELETE_MS = 25;
const HOLD_MS = 1500;
const GAP_MS = 350;

/**
 * Types each phrase in `phrases` out one character at a time, holds it, deletes it, then moves
 * to the next -- purely cosmetic (the visible `placeholder`), so it only runs while `active` (the
 * field is empty; once a merchant types, the real value covers it, same as any placeholder) and
 * is skipped entirely under `prefers-reduced-motion` in favor of the first phrase held static.
 */
function useTypewriterPlaceholder(phrases: string[], active: boolean): string {
  const [text, setText] = useState('');
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;

  useEffect(() => {
    if (!active) return undefined;

    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function tick(): void {
      const phrase = phrasesRef.current[phraseIndex] ?? '';

      if (!deleting) {
        charIndex += 1;
        setText(phrase.slice(0, charIndex));
        if (charIndex >= phrase.length) {
          deleting = true;
          timeoutId = setTimeout(tick, HOLD_MS);
          return;
        }
        timeoutId = setTimeout(tick, TYPE_MS);
        return;
      }

      charIndex -= 1;
      setText(phrase.slice(0, charIndex));
      if (charIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrasesRef.current.length;
        timeoutId = setTimeout(tick, GAP_MS);
        return;
      }
      timeoutId = setTimeout(tick, DELETE_MS);
    }

    timeoutId = setTimeout(tick, GAP_MS);
    return () => clearTimeout(timeoutId);
  }, [active]);

  return text;
}

/**
 * Top-level global search (docs/sessions/2026-09-08-epic17-search-and-inline-detail.md) --
 * chat-input styled (rounded pill, trailing send button) rather than a typical filter field, per
 * the request. Deliberately submit-on-Enter/click, not live-as-you-type: this searches the
 * merchant's entire exception set on the server (see SearchDrawer.tsx / Dashboard.tsx's search
 * mode), so firing it on every keystroke would mean a request per character for no benefit --
 * nothing here needs live suggestions the way a type-ahead would.
 */
/** Purely a felt-affordance delay: long enough that the button's own spinner is visible as
 *  distinct feedback before the drawer takes over with its own loading state, short enough not
 *  to feel sluggish for what's otherwise an instant local dispatch. */
const SUBMIT_FEEDBACK_MS = 1000;

export function GlobalSearchBar(): JSX.Element {
  const dispatch = useAppDispatch();
  const activeQuery = useAppSelector((state) => state.ui.search.query);
  const pendingDraft = useAppSelector((state) => state.ui.search.pendingDraft);
  const drawerOpen = useAppSelector((state) => state.ui.search.drawerOpen);
  const [draft, setDraft] = useState(activeQuery ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasDrawerOpenRef = useRef(drawerOpen);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const typedPlaceholder = useTypewriterPlaceholder(
    PLACEHOLDER_PROMPTS,
    draft.trim() === '' && !prefersReducedMotion,
  );
  const placeholder = prefersReducedMotion ? STATIC_PLACEHOLDER : typedPlaceholder;

  useEffect(() => {
    return () => clearTimeout(submitTimeoutRef.current);
  }, []);

  // Closing the chat drawer clears the search bar's own text -- the drawer's transcript
  // (ui.search.history) still remembers the conversation so reopening it shows the same chat, but
  // this input is what a merchant sees first when the search hero reappears, and it shouldn't
  // still show the last thing they searched. Only fires on the open->closed transition, not on
  // mount or while staying open, so it doesn't clobber whatever's mid-typed.
  useEffect(() => {
    if (wasDrawerOpenRef.current && !drawerOpen) {
      setDraft('');
    }
    wasDrawerOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  // A suggested-prompt chip (SuggestedPrompts.tsx) sets this rather than submitting directly --
  // drop it into the local draft like a keystroke would, put the cursor at the end, then clear it
  // from Redux so it doesn't reapply later (e.g. if the merchant clears the field by hand).
  useEffect(() => {
    if (pendingDraft === null) return;
    setDraft(pendingDraft);
    dispatch(searchDraftConsumed());
    const input = inputRef.current;
    if (input) {
      input.focus();
      const end = pendingDraft.length;
      input.setSelectionRange(end, end);
    }
  }, [pendingDraft, dispatch]);

  function runSubmit(): void {
    const trimmed = draft.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    // The button spins for a beat first; only once that resolves does the chat drawer open --
    // which then shows its own loading state (SearchChatTurn's thinking dots / "Looking up
    // matching transactions...") while the real query is in flight, so the merchant sees two
    // distinct, honest loading stages rather than one that lies about being done early.
    submitTimeoutRef.current = setTimeout(() => {
      dispatch(searchSubmitted(trimmed));
      setIsSubmitting(false);
    }, SUBMIT_FEEDBACK_MS);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    runSubmit();
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
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={isSubmitting}
        // Puts the cursor straight into the search bar on landing/refresh, matching the landing
        // pulse animation above -- both exist to draw the merchant's attention to search first.
        autoFocus
      />
      <button
        type="submit"
        className={styles.sendButton}
        disabled={!draft.trim() || isSubmitting}
        aria-busy={isSubmitting}
      >
        <span aria-hidden="true">
          {isSubmitting ? (
            <svg
              className={styles.sendSpinner}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.35"
              />
              <path
                d="M14 8a6 6 0 0 0-6-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8h11M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="visually-hidden">{isSubmitting ? 'Searching…' : 'Search'}</span>
      </button>
    </form>
  );
}
