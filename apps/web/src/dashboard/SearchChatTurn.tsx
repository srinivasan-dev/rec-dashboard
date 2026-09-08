import { useExceptionsSearch } from '../hooks/useExceptionsSearch';
import { useSearchExplanation } from '../hooks/useSearchExplanation';
import { EXCEPTION_LABELS } from './exceptionLabels';
import { exceptionAmountSummary, exceptionDate } from './formatting';
import { Highlight } from './Highlight';
import styles from './SearchChatPanel.module.css';

export interface SearchChatTurnProps {
  query: string;
  onJumpToRow: (transactionId: string) => void;
}

/**
 * One exchange in the chat: the merchant's query, then Claude's (or the deterministic fallback's)
 * summary, then the matching transactions it was grounded in. `useExceptionsSearch`/
 * `useSearchExplanation` are keyed by query text, so re-rendering an older turn never re-fetches
 * anything already in the TanStack Query cache -- scrolling chat history back up is free.
 */
export function SearchChatTurn({ query, onJumpToRow }: SearchChatTurnProps): JSX.Element {
  const matchesQuery = useExceptionsSearch(query);
  const explanationQuery = useSearchExplanation(query);
  const matches = matchesQuery.data?.data;
  const isIntentMode = matchesQuery.data?.matchType === 'intent';
  // Only highlight for a real keyword match -- in 'intent' mode nothing in the (unfiltered) list
  // actually contains the query text, so highlighting would either do nothing or coincidentally
  // highlight an unrelated substring (same reasoning as Dashboard.tsx's table).
  const highlightQuery = isIntentMode ? null : query;

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
                  : 'AI-generated — verify details'}
              </span>
            ) : null}
          </div>

          {explanationQuery.isLoading ? (
            <div className={styles.thinking} aria-live="polite">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          ) : null}

          {explanationQuery.isError ? (
            <p className={styles.assistantText}>
              We couldn&apos;t generate a summary right now. Matching exceptions are listed below.
            </p>
          ) : null}

          {explanationQuery.data ? (
            <p className={styles.assistantText}>{explanationQuery.data.explanationText}</p>
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

          {matches && matches.length > 0 ? (
            <>
              {isIntentMode ? (
                <p className={styles.empty}>
                  No exact match — showing all {matches.length} exceptions on your account:
                </p>
              ) : null}
              <ul className={styles.resultList}>
                {matches.map((exception) => {
                  const label = EXCEPTION_LABELS[exception.reason];
                  return (
                    <li key={exception.transactionId}>
                      <button
                        type="button"
                        className={styles.resultItem}
                        onClick={() => onJumpToRow(exception.transactionId)}
                      >
                        <span className={styles.resultTransactionId}>
                          <Highlight text={exception.transactionId} query={highlightQuery} />
                        </span>
                        <span className={styles.reasonPill} data-severity={label.severity}>
                          <Highlight text={label.title} query={highlightQuery} />
                        </span>
                        <span className={styles.resultAmount}>
                          <Highlight
                            text={exceptionAmountSummary(exception)}
                            query={highlightQuery}
                          />
                        </span>
                        <span className={styles.resultDate}>{exceptionDate(exception)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
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
