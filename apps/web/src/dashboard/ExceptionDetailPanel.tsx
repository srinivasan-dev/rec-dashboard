import type { ReactNode } from 'react';

import type { LedgerDto, TransactionDto } from '../api/types';
import { useExceptionExplanation } from '../hooks/useExceptionExplanation';
import { useReconciliationTransaction } from '../hooks/useReconciliationTransaction';
import buttons from '../styles/buttons.module.css';
import styles from './ExceptionDetailPanel.module.css';
import { EXCEPTION_LABELS } from './exceptionLabels';
import { formatCurrencyAmount } from './formatting';

/**
 * The mock AI explanation text uses lightweight markdown -- `**bold**` around the transaction
 * headline -- to draw the eye to the key fact before the sentence explaining it. Rendered as
 * plain text this shows the literal asterisks, so split on that one marker and render each bolded
 * segment as a real `<strong>` instead. Deliberately minimal (bold only, no links/lists/etc.) --
 * the mock/LLM output this feeds from is a single short paragraph, never richer markdown.
 */
function renderFormattedExplanation(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    }
    return <span key={index}>{segment}</span>;
  });
}

export interface ExceptionDetailPanelProps {
  transactionId: string;
}

/**
 * Exception detail, inline in the exceptions table (docs/sessions/
 * 2026-09-08-epic17-search-and-inline-detail.md) -- replaces the earlier drawer-based detail view
 * (see git history / ExceptionDrawer.tsx, now repurposed for global search results). Fetches its
 * own data (rather than reusing the row's already-loaded summary) so it stays correct even if the
 * table's filters/page change while expanded, same reasoning the drawer used to document.
 *
 * Two-column layout (not the earlier Details/Settlement vs. Ledger/AI Explain tabs) -- everything
 * a merchant needs to read is now visible without clicking through tabs: the left column stacks
 * the review pill, amount comparison, difference, side-by-side table, and a highlighted next-step
 * callout; the right column is always-visible AI Explain, no longer gated behind opening its own
 * tab (so `useExceptionExplanation` is unconditionally enabled once this panel mounts, i.e. once a
 * merchant expands the row at all).
 *
 * Deliberately no focus trap here: unlike the modal drawer it replaced, this renders inline in
 * normal document/tab order inside a table row -- trapping focus would be actively wrong (a
 * merchant should be able to Tab straight through into the next row).
 *
 * On mobile/tablet-portrait this same non-modal component renders inside ExceptionCard instead of
 * a table row; ExceptionDetailPanel.module.css stacks the two columns there so it still reads as
 * the spec's "full-screen" detail view without becoming a modal.
 */
export function ExceptionDetailPanel({ transactionId }: ExceptionDetailPanelProps): JSX.Element {
  const query = useReconciliationTransaction(transactionId);

  return (
    <div className={styles.panel}>
      {query.isLoading ? <p aria-live="polite">Loading transaction detail...</p> : null}

      {query.isError ? (
        <div role="alert">
          <p>We couldn&apos;t load this transaction&apos;s detail right now.</p>
          <button type="button" className={buttons.secondary} onClick={() => query.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {query.data ? (
        query.data.reason === 'MATCHED' ? (
          <MatchedPanel transaction={query.data} />
        ) : (
          <DetailLayout exception={query.data} />
        )
      ) : null}
    </div>
  );
}

/**
 * A matched transaction isn't an exception -- there's nothing to explain, no next step, no AI
 * summary to generate. A short confirmation instead of the full two-column exception layout: the
 * settlement/ledger amounts (always equal, that's what "matched" means) and a plain "no action
 * needed" message.
 */
function MatchedPanel({ transaction }: { transaction: TransactionDto }): JSX.Element {
  return (
    <div className={styles.panelStack}>
      <span className={styles.matchedPill}>
        <span aria-hidden="true">✓</span> Matched
      </span>

      <div className={styles.amountGrid}>
        <div className={styles.amountCard}>
          <p className={styles.amountLabel}>Settlement</p>
          <p className={styles.amountValue}>
            {transaction.settlement
              ? formatCurrencyAmount(transaction.currency, transaction.settlement.netAmount)
              : '—'}
          </p>
          {transaction.settlement ? (
            <p className={styles.amountDate}>{transaction.settlement.transactionDate}</p>
          ) : null}
        </div>
        <div className={styles.amountCard}>
          <p className={styles.amountLabel}>Ledger</p>
          <p className={styles.amountValue}>
            {transaction.ledger
              ? formatCurrencyAmount(transaction.currency, transaction.ledger.amount)
              : '—'}
          </p>
          {transaction.ledger ? (
            <p className={styles.amountDate}>{transaction.ledger.transactionDate}</p>
          ) : null}
        </div>
      </div>

      <h3 className={styles.copyLabel}>Transaction details</h3>
      <dl className={styles.fieldList}>
        <div className={styles.fieldRow}>
          <dt className={styles.fieldLabel}>Transaction ID</dt>
          <dd className={styles.fieldValue}>{transaction.transactionId}</dd>
        </div>
        <div className={styles.fieldRow}>
          <dt className={styles.fieldLabel}>Currency</dt>
          <dd className={styles.fieldValue}>{transaction.currency}</dd>
        </div>
      </dl>

      <p className={styles.explanationText}>
        The settlement and ledger records for this transaction match. No action needed.
      </p>
    </div>
  );
}

function DetailLayout({ exception }: { exception: TransactionDto }): JSX.Element {
  const label = exception.reason === 'MATCHED' ? null : EXCEPTION_LABELS[exception.reason];
  if (!label) return <MatchedPanel transaction={exception} />;

  return (
    <div className={styles.layout}>
      <div className={styles.detailsColumn}>
        <div className={styles.panelStack}>
          <span className={styles.reviewPill}>
            <span aria-hidden="true">●</span> Needs review
          </span>

          <div className={styles.amountGrid}>
            <div className={styles.amountCard}>
              <p className={styles.amountLabel}>Settlement</p>
              <p className={styles.amountValue}>
                {exception.settlement
                  ? formatCurrencyAmount(exception.currency, exception.settlement.netAmount)
                  : '—'}
              </p>
              {exception.settlement ? (
                <p className={styles.amountDate}>{exception.settlement.transactionDate}</p>
              ) : null}
            </div>
            <div className={styles.amountCard}>
              <p className={styles.amountLabel}>Ledger</p>
              <p className={styles.amountValue}>
                {exception.ledger
                  ? formatCurrencyAmount(exception.currency, exception.ledger.amount)
                  : '—'}
              </p>
              {exception.ledger ? (
                <p className={styles.amountDate}>{exception.ledger.transactionDate}</p>
              ) : null}
            </div>
          </div>

          {exception.differenceAmount !== null ? (
            <div className={styles.differenceBox}>
              <span className={styles.differenceLabel}>Difference</span>
              <span className={styles.differenceValue}>
                {formatCurrencyAmount(exception.currency, exception.differenceAmount)}
              </span>
            </div>
          ) : null}

          {exception.duplicateLedgerEntries ? (
            <DuplicateLedgerEntries
              entries={exception.duplicateLedgerEntries}
              currency={exception.currency}
            />
          ) : null}

          {/* Comparison, transaction details, and description are one connected story --
              "what's different, what is this, and why" -- grouped into a single card so they
              read as one unit rather than three loose sections sharing a column with the amount
              cards above. */}
          <div className={styles.detailsCard}>
            <ComparisonPanel exception={exception} />

            <div>
              <h3 className={styles.copyLabel}>Transaction details</h3>
              <dl className={styles.fieldList}>
                <div className={styles.fieldRow}>
                  <dt className={styles.fieldLabel}>Transaction ID</dt>
                  <dd className={styles.fieldValue}>{exception.transactionId}</dd>
                </div>
                <div className={styles.fieldRow}>
                  <dt className={styles.fieldLabel}>Exception type</dt>
                  <dd className={styles.fieldValue}>{label.title}</dd>
                </div>
                <div className={styles.fieldRow}>
                  <dt className={styles.fieldLabel}>Currency</dt>
                  <dd className={styles.fieldValue}>{exception.currency}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className={styles.copyLabel}>Description</h3>
              <p className={styles.explanationText}>{label.explanation}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.aiColumn}>
        <AiExplainPanel
          transactionId={exception.transactionId}
          nextStepText={label.nextStep}
          turnaroundTime={label.turnaroundTime}
        />
      </div>
    </div>
  );
}

function ComparisonPanel({ exception }: { exception: TransactionDto }): JSX.Element {
  const { settlement, ledger, currency } = exception;

  return (
    <div>
      <h3 className={styles.copyLabel}>Side-by-side comparison</h3>
      <table className={styles.comparisonTable}>
        <caption className="visually-hidden">
          Settlement and ledger values side by side for transaction {exception.transactionId}
        </caption>
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Settlement</th>
            <th scope="col">Ledger</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Amount</td>
            <td>{settlement ? formatCurrencyAmount(currency, settlement.netAmount) : '—'}</td>
            <td>{ledger ? formatCurrencyAmount(currency, ledger.amount) : '—'}</td>
          </tr>
          <tr>
            <td>Date</td>
            <td>{settlement?.transactionDate ?? '—'}</td>
            <td>{ledger?.transactionDate ?? '—'}</td>
          </tr>
          <tr>
            <td>Reference</td>
            <td>{settlement?.settlementId ?? '—'}</td>
            <td>{ledger?.ledgerId ?? '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AiExplainPanel({
  transactionId,
  nextStepText,
  turnaroundTime,
}: {
  transactionId: string;
  nextStepText: string;
  turnaroundTime: string;
}): JSX.Element {
  const query = useExceptionExplanation(transactionId, true);

  return (
    <div className={styles.aiPanel}>
      <div className={styles.nextStepBox}>
        <p className={styles.nextStepHeading}>
          <span aria-hidden="true">→</span> Next step
        </p>
        <p className={styles.nextStepText}>{nextStepText}</p>
        <span className={styles.turnaroundChip}>
          <span aria-hidden="true">⏱</span> Expected turnaround: {turnaroundTime}
        </span>
      </div>

      {query.isLoading ? <p aria-live="polite">Generating explanation...</p> : null}

      {query.isError ? (
        <div role="alert">
          <p>We couldn&apos;t generate an explanation right now. The details above are accurate.</p>
        </div>
      ) : null}

      {query.data ? (
        <div className={styles.aiBox}>
          <div className={styles.aiHeader}>
            <h3 className={styles.aiHeaderTitle}>
              <span aria-hidden="true">✦</span> Explanation
            </h3>
            <span className={styles.aiBadge}>
              {query.data.generatedBy === 'fallback'
                ? 'Standard explanation'
                : 'Auto-generated — verify details'}
            </span>
          </div>
          <p className={styles.aiText}>{renderFormattedExplanation(query.data.explanationText)}</p>
        </div>
      ) : null}

      {/* Only makes sense once there's an AI explanation on screen to disclaim -- showing it
          while still loading (or if generation fails) would refer to content that isn't there. */}
      {query.data ? (
        <p className={styles.disclaimer}>
          <span className={styles.disclaimerLabel}>Disclaimer:</span> This explanation is generated
          automatically from the transaction data. Always verify against your own records before
          taking action.
        </p>
      ) : null}
    </div>
  );
}

function DuplicateLedgerEntries({
  entries,
  currency,
}: {
  entries: LedgerDto[];
  currency: string;
}): JSX.Element {
  return (
    <ul className={styles.duplicateList} aria-label="Duplicate ledger entries">
      {entries.map((entry) => (
        <li key={entry.ledgerId}>
          {entry.ledgerId}: {formatCurrencyAmount(currency, entry.amount)} on{' '}
          {entry.transactionDate}
        </li>
      ))}
    </ul>
  );
}
