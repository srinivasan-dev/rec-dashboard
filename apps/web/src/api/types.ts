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

export interface FinancialImpactDto {
  currency: string;
  amount: string;
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

/**
 * Mirrors apps/api's `SearchResult` (`reconciliationService.ts`'s `searchExceptionsOrAll`).
 * `matchType: 'intent'` means `q` didn't literally match anything, so `data` is the merchant's
 * *entire* exception set instead (the same pool the AI summary reasons over for a vague query) --
 * the table renders it unfiltered/unhighlighted rather than going blank while the chat panel
 * still talks about specific transactions.
 */
export interface SearchResultDto {
  data: ExceptionDto[];
  matchType: 'literal' | 'intent';
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
  sortBy: SortBy;
  sortOrder: SortOrder;
}
