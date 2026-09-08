import { useId, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import type { ExceptionDto, LedgerDto } from '../api/types';
import { useExceptionExplanation } from '../hooks/useExceptionExplanation';
import { useReconciliationException } from '../hooks/useReconciliationException';
import buttons from '../styles/buttons.module.css';
import styles from './ExceptionDetailPanel.module.css';
import { EXCEPTION_LABELS } from './exceptionLabels';
import { formatCurrencyAmount } from './formatting';

type DetailTab = 'details' | 'comparison' | 'ai';

const TABS: { id: DetailTab; icon: string | null; label: string }[] = [
  { id: 'details', icon: null, label: 'Details' },
  { id: 'comparison', icon: null, label: 'Settlement vs. Ledger' },
  { id: 'ai', icon: '✦', label: 'AI Explain' },
];

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
 * Deliberately no focus trap here: unlike the modal drawer it replaced, this renders inline in
 * normal document/tab order inside a table row -- trapping focus would be actively wrong (a
 * merchant should be able to Tab straight through into the next row).
 */
export function ExceptionDetailPanel({ transactionId }: ExceptionDetailPanelProps): JSX.Element {
  const query = useReconciliationException(transactionId);
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const idBase = useId();

  return (
    <div className={styles.panel}>
      {query.isLoading ? <p aria-live="polite">Loading exception detail...</p> : null}

      {query.isError ? (
        <div role="alert">
          <p>We couldn&apos;t load this exception&apos;s detail right now.</p>
          <button type="button" className={buttons.secondary} onClick={() => query.refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {query.data ? (
        <>
          <DetailTabs
            idBase={idBase}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            transactionId={query.data.transactionId}
          />
          <div className={styles.body}>
            <DetailPanels idBase={idBase} exception={query.data} activeTab={activeTab} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function DetailTabs({
  idBase,
  activeTab,
  onTabChange,
  transactionId,
}: {
  idBase: string;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  transactionId: string;
}): JSX.Element {
  function handleKeyDown(event: ReactKeyboardEvent, index: number): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : (index - 1 + TABS.length) % TABS.length;
    onTabChange(TABS[next]!.id);
    document.getElementById(`${idBase}-tab-${TABS[next]!.id}`)?.focus();
  }

  return (
    <div className={styles.tablist} role="tablist" aria-label={`Views for ${transactionId}`}>
      {TABS.map((tab, index) => (
        <button
          key={tab.id}
          id={`${idBase}-tab-${tab.id}`}
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={activeTab === tab.id}
          aria-controls={`${idBase}-panel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {tab.icon ? <span aria-hidden="true">{tab.icon} </span> : null}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function DetailPanels({
  idBase,
  exception,
  activeTab,
}: {
  idBase: string;
  exception: ExceptionDto;
  activeTab: DetailTab;
}): JSX.Element {
  const label = EXCEPTION_LABELS[exception.reason];

  return (
    <>
      <div
        id={`${idBase}-panel-details`}
        aria-labelledby={`${idBase}-tab-details`}
        hidden={activeTab !== 'details'}
        role="tabpanel"
        tabIndex={0}
      >
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

          <div className={styles.copyBlock}>
            <p>{label.explanation}</p>
            <p>Next step: {label.nextStep}</p>
          </div>
        </div>
      </div>

      <div
        id={`${idBase}-panel-comparison`}
        aria-labelledby={`${idBase}-tab-comparison`}
        hidden={activeTab !== 'comparison'}
        role="tabpanel"
        tabIndex={0}
      >
        <ComparisonPanel exception={exception} />
      </div>

      <div
        id={`${idBase}-panel-ai`}
        aria-labelledby={`${idBase}-tab-ai`}
        hidden={activeTab !== 'ai'}
        role="tabpanel"
        tabIndex={0}
      >
        {activeTab === 'ai' ? <AiExplainPanel transactionId={exception.transactionId} /> : null}
      </div>
    </>
  );
}

function ComparisonPanel({ exception }: { exception: ExceptionDto }): JSX.Element {
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

function AiExplainPanel({ transactionId }: { transactionId: string }): JSX.Element {
  const query = useExceptionExplanation(transactionId, true);

  return (
    <div className={styles.aiPanel}>
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
          <p className={styles.aiText}>{query.data.explanationText}</p>
        </div>
      ) : null}

      <div className={styles.disclaimer}>
        <span className={styles.disclaimerLabel}>Disclaimer</span>
        This explanation is generated automatically from the transaction data. Always verify against
        your own records before taking action.
      </div>
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
