import { useEffect, useMemo, useRef, useState } from 'react';

import { useMediaQuery } from '../hooks/useMediaQuery';
import { useExceptionsSearch } from '../hooks/useExceptionsSearch';
import { useSearchExplanation } from '../hooks/useSearchExplanation';
import { useAppDispatch } from '../store/hooks';
import { toastShown } from '../store/uiSlice';
import { EXCEPTION_LABELS } from './exceptionLabels';
import { formatChatText } from './formatChatText';
import { exceptionAmountSummary, exceptionDate } from './formatting';
import { Highlight } from './Highlight';
import styles from './SearchChatPanel.module.css';
import { generateTicketNumber, SUPPORT_TICKET_PROMPT } from './supportTicket';

export interface SearchChatTurnProps {
  query: string;
}

const REVEAL_WORD_MS = 35;

/**
 * Reveals `text` one word at a time once it arrives, like Claude/ChatGPT's response typing --
 * skipped under `prefers-reduced-motion` (shows the full text immediately). Resets whenever
 * `text` itself changes (a new explanation for this turn), not on every render.
 */
function useTypedReveal(
  text: string | undefined,
  reduceMotion: boolean,
): { shown: string; isTyping: boolean } {
  const [shownCount, setShownCount] = useState(0);
  const wordsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!text) {
      setShownCount(0);
      return undefined;
    }
    if (reduceMotion) {
      wordsRef.current = text.split(' ');
      setShownCount(wordsRef.current.length);
      return undefined;
    }

    wordsRef.current = text.split(' ');
    setShownCount(0);
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      setShownCount(count);
      if (count >= wordsRef.current.length) clearInterval(id);
    }, REVEAL_WORD_MS);
    return () => clearInterval(id);
  }, [text, reduceMotion]);

  const shown = wordsRef.current.slice(0, shownCount).join(' ');
  return { shown, isTyping: shownCount < wordsRef.current.length };
}

/**
 * One exchange in the chat: the merchant's query, Reco's (or the deterministic fallback's)
 * summary typed out word by word, then the matching transactions it's grounded in as a real
 * table -- same data `useExceptionsSearch` feeds the main table with, just formatted for the
 * drawer's narrower column.
 */
export function SearchChatTurn({ query }: SearchChatTurnProps): JSX.Element {
  // The "Create a support ticket" suggestion (SearchChatPanel.tsx) submits this exact sentinel as
  // its own chat turn -- it isn't a real question, so it never hits the search/explain APIs
  // (`enabled: false` below, via passing `null`); this turn renders its own canned response
  // instead of the normal explanation/matches flow.
  const isSupportTicket = query === SUPPORT_TICKET_PROMPT;
  const dispatch = useAppDispatch();
  // Generated once per turn instance (mount), not on every render -- each chat turn is its own
  // component instance (keyed by index in SearchChatPanel.tsx), so asking for a second ticket
  // later in the same conversation naturally gets a fresh number.
  const ticketNumber = useMemo(() => generateTicketNumber(), []);

  useEffect(() => {
    if (!isSupportTicket) return;
    dispatch(
      toastShown({
        id: `toast-${Date.now()}`,
        message: `Support ticket ${ticketNumber} created successfully. Our team will follow up shortly.`,
        tone: 'success',
      }),
    );
    // Only ever fires once per mounted turn -- `ticketNumber` is stable for this instance's
    // lifetime (see the `useMemo` above), and `isSupportTicket`/`dispatch` never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchesQuery = useExceptionsSearch(isSupportTicket ? null : query);
  const explanationQuery = useSearchExplanation(isSupportTicket ? null : query);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { shown: shownExplanation, isTyping } = useTypedReveal(
    explanationQuery.data?.explanationText,
    reduceMotion,
  );

  if (isSupportTicket) {
    return (
      <div className={styles.turn}>
        <div className={styles.userRow}>
          <div className={styles.userBubble}>{query}</div>
        </div>
        <div className={styles.assistantRow}>
          <div className={styles.assistantBubble}>
            <div className={styles.assistantHeader}>
              <span className={styles.assistantIcon} aria-hidden="true">
                ✦
              </span>
              <span className={styles.assistantBadge}>Support</span>
            </div>
            <p className={styles.assistantText}>
              {formatChatText(
                `Support ticket ${ticketNumber} created successfully. Our team will follow up with you shortly.`,
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const matches = matchesQuery.data?.data;
  const isLiteralMode = matchesQuery.data?.matchType === 'literal';
  // Only highlight for a real keyword match -- in 'intent' mode nothing in the (unfiltered) rows
  // actually contains the query text, so highlighting would either do nothing or coincidentally
  // highlight an unrelated substring (same reasoning as Dashboard.tsx's table). 'off-topic' never
  // has any rows to highlight in the first place.
  const highlightQuery = isLiteralMode ? query : null;

  return (
    <div className={styles.turn}>
      <div className={styles.userRow}>
        <div className={styles.userBubble}>{query}</div>
      </div>

      <div className={styles.assistantRow}>
        <div className={styles.assistantBubble}>
          <div className={styles.assistantHeader}>
            <span className={styles.assistantIcon} aria-hidden="true">
              ✦
            </span>
            {explanationQuery.data ? (
              <span className={styles.assistantBadge}>
                {explanationQuery.data.generatedBy === 'fallback'
                  ? 'Standard summary'
                  : explanationQuery.data.generatedBy === 'knowledge-base'
                    ? 'Help center answer'
                    : 'AI-generated — verify details'}
              </span>
            ) : null}
          </div>

          {explanationQuery.isLoading ? (
            <div className={styles.thinking} aria-live="polite">
              <span className={styles.thinkingLabel}>Thinking</span>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          ) : null}

          {explanationQuery.isError ? (
            <p className={styles.assistantText}>We couldn&apos;t generate a summary right now.</p>
          ) : null}

          {explanationQuery.data ? (
            <p className={styles.assistantText} aria-live="polite">
              {formatChatText(shownExplanation)}
              {isTyping ? <span className={styles.typingCursor} aria-hidden="true" /> : null}
            </p>
          ) : null}

          {matchesQuery.isLoading ? (
            <p className={styles.empty} aria-live="polite">
              Looking up matching transactions...
            </p>
          ) : null}

          {matchesQuery.isError ? (
            <p className={styles.empty} role="alert">
              We couldn&apos;t load the matching transactions right now.
            </p>
          ) : null}

          {/* Waits for the explanation to have actually settled (arrived and finished its typed
              reveal, or errored out) before showing matches -- `isTyping` alone defaults to
              `false` before `explanationQuery.data` ever shows up (there are no words to reveal
              yet), so gating on it by itself let the table render while the summary above was
              still "Thinking...", before the LLM response was done. `isError` is included too so
              a failed explanation request doesn't permanently hide matches that loaded fine on
              their own, independent query. */}
          {matches &&
          matches.length > 0 &&
          (explanationQuery.data || explanationQuery.isError) &&
          !isTyping ? (
            <div className={styles.matchesTableWrap}>
              <table className={styles.matchesTable}>
                <caption className="visually-hidden">
                  {matches.length} matching {matches.length === 1 ? 'transaction' : 'transactions'}
                </caption>
                <colgroup>
                  <col style={{ width: '62%' }} />
                  <col style={{ width: '38%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Transaction details</th>
                    {/* No visible header text -- the amount column is self-evident once the row
                        header spells out what each transaction is (id, reason); a screen reader
                        still gets a real column name via the visually-hidden span. */}
                    <th scope="col">
                      <span className="visually-hidden">Amount</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((exception) => {
                    const label = EXCEPTION_LABELS[exception.reason];
                    return (
                      <tr key={exception.transactionId}>
                        <th scope="row">
                          <div className={styles.matchCellStack}>
                            <span className={styles.matchTransactionId}>
                              <Highlight text={exception.transactionId} query={highlightQuery} />
                            </span>
                            <span className={styles.reasonPill} data-severity={label.severity}>
                              {label.title}
                            </span>
                          </div>
                        </th>
                        <td className={styles.matchAmount}>
                          <div className={styles.matchAmountStack}>
                            <span>{exceptionAmountSummary(exception)}</span>
                            <span className={styles.matchDate}>{exceptionDate(exception)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* The empty-search case is already covered by the summary text above once it loads
              (both the real provider and the deterministic fallback say "no exceptions matched")
              -- this is only a placeholder for the gap before that arrives. Only reachable when
              the merchant has zero exceptions at all, since 'intent' mode otherwise falls back to
              the full (non-empty) account. */}
          {matches &&
          matches.length === 0 &&
          !explanationQuery.data &&
          !explanationQuery.isLoading ? (
            <p className={styles.empty}>No exceptions match &ldquo;{query}&rdquo;.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
