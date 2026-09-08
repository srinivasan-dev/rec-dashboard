import type { ExceptionReason, TransactionDto } from '../api/types';

export interface ExceptionLabel {
  title: string;
  explanation: string;
  nextStep: string;
  /**
   * Purely a visual grouping (docs/design/...Final Design.html's amber-vs-gray reason pills):
   * 'amount' for reasons where money is unaccounted for or doesn't match, 'structural' for
   * reasons that are about the record itself (a duplicate, a date) rather than the amount,
   * 'matched' for a transaction that isn't an exception at all (see `MATCHED_LABEL`). Never used
   * for reconciliation logic -- that's entirely packages/shared's job.
   */
  severity: 'amount' | 'structural' | 'matched';
  /**
   * A rough, merchant-facing expectation for how long following `nextStep` typically takes to
   * resolve -- an estimate to set expectations, not a contractual SLA (there's no backend
   * turnaround-tracking to back a real one yet). Deliberately a range in business days, matching
   * how support/ops teams already communicate timelines elsewhere in fintech.
   */
  turnaroundTime: string;
}

/**
 * Merchant-facing language for every exception reason -- verbatim from docs/product-spec.md §9,
 * which is the source of truth for this copy. Never show the internal code (`AMOUNT_MISMATCH`)
 * to a merchant; always resolve through this table instead.
 *
 * `CURRENCY_MISMATCH` isn't in product-spec.md §9 (that table predates the defensive currency
 * check added in Phase 3 -- see docs/architecture.md §9). This entry follows the same language
 * principles (calm, factual, a concrete next step) but hasn't been reviewed by product the way
 * the other five have. Flagged in docs/sessions/ as a gap worth closing before submission.
 */
export const EXCEPTION_LABELS: Record<ExceptionReason, ExceptionLabel> = {
  MISSING_LEDGER: {
    title: 'Not recorded in ledger',
    explanation:
      "This transaction appears in the processor's settlement but doesn't have a matching entry in our ledger.",
    nextStep:
      'Review whether this transaction was processed. If expected, contact support with this transaction ID.',
    severity: 'amount',
    turnaroundTime: '2-3 business days',
  },
  MISSING_SETTLEMENT: {
    title: 'No matching settlement',
    explanation:
      "This transaction is in our ledger but wasn't included in the processor's settlement file.",
    nextStep:
      'This may indicate a pending settlement. If the transaction is older than your typical settlement cycle, contact support.',
    severity: 'amount',
    turnaroundTime: '3-5 business days',
  },
  DUPLICATE_LEDGER: {
    title: 'Duplicate entry',
    explanation: 'This transaction appears more than once in the ledger for the same amount.',
    nextStep:
      'Review whether the transaction was accidentally recorded twice. Contact support if you need the duplicate removed.',
    severity: 'structural',
    turnaroundTime: '1-2 business days',
  },
  AMOUNT_MISMATCH: {
    title: "Amount doesn't match",
    explanation: 'The settlement amount from the processor differs from the amount in our ledger.',
    nextStep:
      'Compare the settlement and ledger amounts shown. Contact support with this transaction ID if you need the difference investigated.',
    severity: 'amount',
    turnaroundTime: '3-5 business days',
  },
  DATE_MISMATCH: {
    title: 'Date discrepancy',
    explanation: 'The transaction date in the settlement differs from the date in our ledger.',
    nextStep:
      'Small date differences can occur due to processing timing. If the dates are significantly different, contact support.',
    severity: 'structural',
    turnaroundTime: '1-2 business days',
  },
  CURRENCY_MISMATCH: {
    title: "Currency doesn't match",
    explanation:
      'The settlement currency from the processor differs from the currency recorded in our ledger.',
    nextStep:
      'Compare the settlement and ledger currencies shown. Contact support with this transaction ID if you need this investigated.',
    severity: 'amount',
    turnaroundTime: '3-5 business days',
  },
};

/**
 * Not a real exception -- the label used for a matched transaction (`TransactionDto.reason ===
 * 'MATCHED'`) wherever a row needs *some* label object, e.g. the table's reason pill. `explanation`/
 * `nextStep`/`turnaroundTime` are never actually read for a matched row (ExceptionDetailPanel.tsx
 * shows its own simple confirmation panel instead of the full exception detail layout), so these
 * are just honest placeholders keeping this a complete `ExceptionLabel`, not `undefined`/`any`.
 */
export const MATCHED_LABEL: ExceptionLabel = {
  title: 'Matched',
  explanation: 'This transaction was automatically matched between the settlement and the ledger.',
  nextStep: 'No action needed.',
  severity: 'matched',
  turnaroundTime: 'N/A',
};

/** Resolves a table row's reason pill/label regardless of whether it's a real exception or a
 *  matched transaction -- the one place that needs to know both `EXCEPTION_LABELS` and
 *  `MATCHED_LABEL` exist, so callers (ExceptionsTable.tsx, ExceptionCard.tsx, ...) never have to
 *  branch on `reason === 'MATCHED'` themselves. */
export function reasonLabelFor(reason: TransactionDto['reason']): ExceptionLabel {
  return reason === 'MATCHED' ? MATCHED_LABEL : EXCEPTION_LABELS[reason];
}
