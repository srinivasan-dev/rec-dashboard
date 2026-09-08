import type { ExceptionReason } from '../api/types';

export interface ExceptionLabel {
  title: string;
  explanation: string;
  nextStep: string;
  /**
   * Purely a visual grouping (docs/design/...Final Design.html's amber-vs-gray reason pills):
   * 'amount' for reasons where money is unaccounted for or doesn't match, 'structural' for
   * reasons that are about the record itself (a duplicate, a date) rather than the amount.
   * Never used for reconciliation logic -- that's entirely packages/shared's job.
   */
  severity: 'amount' | 'structural';
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
  },
  MISSING_SETTLEMENT: {
    title: 'No matching settlement',
    explanation:
      "This transaction is in our ledger but wasn't included in the processor's settlement file.",
    nextStep:
      'This may indicate a pending settlement. If the transaction is older than your typical settlement cycle, contact support.',
    severity: 'amount',
  },
  DUPLICATE_LEDGER: {
    title: 'Duplicate entry',
    explanation: 'This transaction appears more than once in the ledger for the same amount.',
    nextStep:
      'Review whether the transaction was accidentally recorded twice. Contact support if you need the duplicate removed.',
    severity: 'structural',
  },
  AMOUNT_MISMATCH: {
    title: "Amount doesn't match",
    explanation: 'The settlement amount from the processor differs from the amount in our ledger.',
    nextStep:
      'Compare the settlement and ledger amounts shown. Contact support with this transaction ID if you need the difference investigated.',
    severity: 'amount',
  },
  DATE_MISMATCH: {
    title: 'Date discrepancy',
    explanation: 'The transaction date in the settlement differs from the date in our ledger.',
    nextStep:
      'Small date differences can occur due to processing timing. If the dates are significantly different, contact support.',
    severity: 'structural',
  },
  CURRENCY_MISMATCH: {
    title: "Currency doesn't match",
    explanation:
      'The settlement currency from the processor differs from the currency recorded in our ledger.',
    nextStep:
      'Compare the settlement and ledger currencies shown. Contact support with this transaction ID if you need this investigated.',
    severity: 'amount',
  },
};
