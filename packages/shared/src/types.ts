export type Currency = string;

export interface SettlementRecord {
  settlementId: string;
  transactionId: string;
  merchantId: string;
  transactionDate: string; // ISO date string, e.g. "2026-07-08"
  settlementDate: string;
  currency: Currency;
  grossAmountMinorUnits: number;
  feeAmountMinorUnits: number;
  netAmountMinorUnits: number;
  status: string;
}

export interface LedgerRecord {
  ledgerId: string;
  transactionId: string;
  merchantId: string;
  transactionDate: string;
  currency: Currency;
  amountMinorUnits: number;
  status: string;
}

export type ExceptionReason =
  | 'MISSING_LEDGER'
  | 'MISSING_SETTLEMENT'
  | 'DUPLICATE_LEDGER'
  | 'AMOUNT_MISMATCH'
  | 'DATE_MISMATCH'
  | 'CURRENCY_MISMATCH';

export interface MatchedTransaction {
  merchantId: string;
  transactionId: string;
  currency: Currency;
  settlement: SettlementRecord;
  ledger: LedgerRecord;
}

/**
 * A single, already-decided reconciliation exception. At most one exception is ever produced
 * per (merchantId, transactionId) — see reconcile.ts for the precedence rule that guarantees
 * this and docs/reconciliation-rules.md for why.
 */
export interface ReconciliationException {
  merchantId: string;
  transactionId: string;
  reason: ExceptionReason;
  /** Currency the financial impact (if any) is expressed in. */
  currency: Currency;
  settlement: SettlementRecord | null;
  /** The single ledger entry for DATE_MISMATCH/AMOUNT_MISMATCH/CURRENCY_MISMATCH, or the first
   *  entry (by ledgerId) for MISSING_SETTLEMENT. Null for MISSING_LEDGER. */
  ledger: LedgerRecord | null;
  /** All ledger entries for this key, present only when reason is DUPLICATE_LEDGER. */
  duplicateLedgerEntries: LedgerRecord[] | null;
  /** abs(settlement.net - ledger.amount) for AMOUNT_MISMATCH; null for every other reason. */
  differenceMinorUnits: number | null;
}

export interface FinancialImpact {
  currency: Currency;
  amountMinorUnits: number;
}

export interface ReconciliationSummary {
  merchantId: string;
  /** Count of distinct (merchantId, transactionId) keys seen on either side. */
  totalChecked: number;
  matchedCount: number;
  exceptionCount: number;
  exceptionsByReason: Record<ExceptionReason, number>;
  /** Grouped by currency — never summed across currencies. See docs/architecture.md §8. */
  financialImpactByCurrency: FinancialImpact[];
}

export interface ReconciliationResult {
  merchantId: string;
  matched: MatchedTransaction[];
  exceptions: ReconciliationException[];
  summary: ReconciliationSummary;
}
