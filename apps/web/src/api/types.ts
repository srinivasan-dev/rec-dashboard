// The wire contract with apps/api -- apps/web never imports apps/api code directly (see
// docs/architecture.md §5), so these mirror apps/api's serializers by hand. `ExceptionReason` is
// the one type reused from packages/shared: shared domain vocabulary, not an API-specific shape.
import type { ExceptionReason } from '@rapyd-portal/shared';

export type { ExceptionReason };

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
  reason: ExceptionReason;
  currency: string;
  settlement: SettlementDto | null;
  ledger: LedgerDto | null;
  duplicateLedgerEntries: LedgerDto[] | null;
  differenceAmount: string | null;
}

/**
 * Same shape as `ExceptionDto`, widened to also cover matched transactions (`reason: 'MATCHED'`)
 * -- backs GET /transactions (reconciliationController.ts's `listTransactionsHandler`), the "show
 * matched transactions too" table view (Toolbar.tsx's checkbox). `ExceptionDto[]` is always
 * assignable here (its `reason: ExceptionReason` is a subset), so components that render exception
 * rows only need this wider prop type, not two parallel ones, to also handle matched rows -- see
 * `exceptionLabels.ts`'s `reasonLabelFor`.
 */
export interface TransactionDto {
  id: string;
  merchantId: string;
  transactionId: string;
  reason: ExceptionReason | 'MATCHED';
  currency: string;
  settlement: SettlementDto | null;
  ledger: LedgerDto | null;
  duplicateLedgerEntries: LedgerDto[] | null;
  differenceAmount: string | null;
}

export interface FinancialImpactDto {
  currency: string;
  amount: string;
}

/** Mirrors apps/api's `CurrencyTotalsDto` (`reconciliationSerializers.ts`) -- settlement-side vs
 *  ledger-side totals per currency, across every checked transaction (matched and exceptions
 *  alike), not just the exceptions' financial impact. */
export interface CurrencyTotalsDto {
  currency: string;
  settlementAmount: string;
  ledgerAmount: string;
  /** Count of this currency's exceptions with no computable dollar figure (duplicate entries,
   *  date mismatches, currency mismatches) -- see FinancialImpactBarChart.tsx's badge. */
  noImpactExceptionCount: number;
}

export interface SummaryDto {
  merchantId: string;
  totalChecked: number;
  matchedCount: number;
  exceptionCount: number;
  exceptionsByReason: Record<ExceptionReason, number>;
  financialImpactByCurrency: FinancialImpactDto[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ExceptionsListResponse {
  data: ExceptionDto[];
  pagination: Pagination;
}

export interface TransactionsListResponse {
  data: TransactionDto[];
  pagination: Pagination;
}

/**
 * Mirrors apps/api's `SearchResult` (`reconciliationService.ts`'s `searchExceptionsOrAll`).
 * `matchType: 'intent'` means `q` didn't literally match anything but still plausibly relates to
 * reconciliation, so `data` is the merchant's *entire* exception set instead (the same pool the
 * AI summary reasons over for a vague query) -- the table renders it unfiltered/unhighlighted
 * rather than going blank while the chat panel still talks about specific transactions.
 * `matchType: 'off-topic'` means the query has no plausible connection to reconciliation at all
 * (e.g. "what is the capital of Japan") -- `data` is empty; the chat panel shows a polite decline
 * instead of a summary.
 * `matchType: 'knowledge-base'` means the query matched a mocked FAQ answer (e.g. a refund-timing
 * question) rather than asking about the merchant's own account -- `data` is empty; the chat
 * panel shows that canned answer instead of a summary or an account dump.
 */
export interface SearchResultDto {
  data: ExceptionDto[];
  matchType: 'literal' | 'intent' | 'off-topic' | 'knowledge-base';
}

/**
 * Mirrors apps/api's `ExplanationResponse` (`explanationService.ts`, Phase 8). `generatedBy` is
 * the provider id ('mock' today) on success, or 'fallback' when the deterministic fallback was
 * used -- never an error shape, since a failed/unusable provider result is never surfaced as one.
 */
export interface ExplanationDto {
  explanationText: string;
  generatedBy: string;
}

/** Mirrors apps/api's `SearchExplanationResponse` (`searchExplanationService.ts`). Same
 *  `generatedBy` contract as `ExplanationDto` ('claude' on success, 'fallback' otherwise), plus
 *  the match count the summary was generated from. */
export interface SearchExplanationDto {
  explanationText: string;
  generatedBy: string;
  matchCount: number;
}

export type SortBy = 'transactionDate' | 'transactionId' | 'reason' | 'differenceAmount';
export type SortOrder = 'asc' | 'desc';
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExceptionsFilters {
  page: number;
  pageSize: number;
  reason?: ExceptionReason;
  from?: string;
  to?: string;
  /** Case-insensitive substring match against transaction id (Toolbar.tsx's
   *  TransactionIdSearchBox) -- distinct from the global search bar, which also matches reason/
   *  currency/amounts. */
  transactionId?: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  /** Toolbar.tsx's "Show matched transactions" checkbox -- false (default) is today's exceptions-
   *  only table; true additionally includes every matched transaction via GET /transactions
   *  instead of GET /exceptions. */
  showMatched?: boolean;
}
