import {
  formatMinorUnitsAsDecimal,
  type LedgerRecord,
  type ReconciliationException,
  type ReconciliationSummary,
  type SettlementRecord,
} from '@rapyd-portal/shared';

import type { CurrencyTotals, Transaction } from '../services/reconciliationService';

export interface SettlementDto {
  settlementId: string;
  transactionDate: string;
  settlementDate: string;
  currency: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  status: string;
}

export interface LedgerDto {
  ledgerId: string;
  transactionDate: string;
  currency: string;
  amount: string;
  status: string;
}

export interface ExceptionDto {
  id: string;
  merchantId: string;
  transactionId: string;
  reason: ReconciliationException['reason'];
  currency: string;
  settlement: SettlementDto | null;
  ledger: LedgerDto | null;
  duplicateLedgerEntries: LedgerDto[] | null;
  differenceAmount: string | null;
}

export interface SummaryDto {
  merchantId: string;
  totalChecked: number;
  matchedCount: number;
  exceptionCount: number;
  exceptionsByReason: ReconciliationSummary['exceptionsByReason'];
  financialImpactByCurrency: { currency: string; amount: string }[];
}

function toSettlementDto(settlement: SettlementRecord | null): SettlementDto | null {
  if (!settlement) return null;
  return {
    settlementId: settlement.settlementId,
    transactionDate: settlement.transactionDate,
    settlementDate: settlement.settlementDate,
    currency: settlement.currency,
    grossAmount: formatMinorUnitsAsDecimal(settlement.grossAmountMinorUnits),
    feeAmount: formatMinorUnitsAsDecimal(settlement.feeAmountMinorUnits),
    netAmount: formatMinorUnitsAsDecimal(settlement.netAmountMinorUnits),
    status: settlement.status,
  };
}

function toLedgerDto(ledger: LedgerRecord | null): LedgerDto | null {
  if (!ledger) return null;
  return {
    ledgerId: ledger.ledgerId,
    transactionDate: ledger.transactionDate,
    currency: ledger.currency,
    amount: formatMinorUnitsAsDecimal(ledger.amountMinorUnits),
    status: ledger.status,
  };
}

export function toExceptionDto(exception: ReconciliationException): ExceptionDto {
  return {
    // The exception "id" is its transactionId -- the reconciliation engine guarantees at most
    // one exception per (merchantId, transactionId), so it's a valid unique id within a
    // merchant's scope without inventing a separate identifier.
    id: exception.transactionId,
    merchantId: exception.merchantId,
    transactionId: exception.transactionId,
    reason: exception.reason,
    currency: exception.currency,
    settlement: toSettlementDto(exception.settlement),
    ledger: toLedgerDto(exception.ledger),
    duplicateLedgerEntries:
      exception.duplicateLedgerEntries?.map((entry) => toLedgerDto(entry)!) ?? null,
    differenceAmount:
      exception.differenceMinorUnits === null
        ? null
        : formatMinorUnitsAsDecimal(exception.differenceMinorUnits),
  };
}

/** Same shape as `ExceptionDto`, widened so a matched transaction can be serialized with
 *  `reason: 'MATCHED'` -- see apps/web's `TransactionDto`, which mirrors this exactly. */
export interface TransactionDto extends Omit<ExceptionDto, 'reason'> {
  reason: ExceptionDto['reason'] | 'MATCHED';
}

export function toTransactionDto(item: Transaction): TransactionDto {
  if (item.kind === 'exception') return toExceptionDto(item.exception);

  const { matched } = item;
  return {
    id: matched.transactionId,
    merchantId: matched.merchantId,
    transactionId: matched.transactionId,
    reason: 'MATCHED',
    currency: matched.currency,
    settlement: toSettlementDto(matched.settlement),
    ledger: toLedgerDto(matched.ledger),
    duplicateLedgerEntries: null,
    // A matched pair has no difference by definition -- settlement and ledger amounts are equal,
    // that's what "matched" means.
    differenceAmount: null,
  };
}

export interface CurrencyTotalsDto {
  currency: string;
  settlementAmount: string;
  ledgerAmount: string;
  /** Count of this currency's exceptions with no computable dollar figure (duplicate entries,
   *  date mismatches, currency mismatches) -- see `CurrencyTotals.noImpactExceptionCount`. */
  noImpactExceptionCount: number;
}

export function toCurrencyTotalsDto(totals: CurrencyTotals): CurrencyTotalsDto {
  return {
    currency: totals.currency,
    settlementAmount: formatMinorUnitsAsDecimal(totals.settlementMinorUnits),
    ledgerAmount: formatMinorUnitsAsDecimal(totals.ledgerMinorUnits),
    noImpactExceptionCount: totals.noImpactExceptionCount,
  };
}

export function toSummaryDto(summary: ReconciliationSummary): SummaryDto {
  return {
    merchantId: summary.merchantId,
    totalChecked: summary.totalChecked,
    matchedCount: summary.matchedCount,
    exceptionCount: summary.exceptionCount,
    exceptionsByReason: summary.exceptionsByReason,
    financialImpactByCurrency: summary.financialImpactByCurrency.map((impact) => ({
      currency: impact.currency,
      amount: formatMinorUnitsAsDecimal(impact.amountMinorUnits),
    })),
  };
}
