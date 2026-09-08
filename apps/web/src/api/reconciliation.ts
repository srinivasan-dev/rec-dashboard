import { apiFetch } from './client';
import type {
  CurrencyTotalsDto,
  ExceptionDto,
  ExceptionsFilters,
  ExceptionsListResponse,
  ExplanationDto,
  ExportFormat,
  SearchExplanationDto,
  SearchResultDto,
  SummaryDto,
  TransactionDto,
  TransactionsListResponse,
} from './types';

function toSearchParams(filters: Partial<ExceptionsFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.reason) params.set('reason', filters.reason);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.transactionId) params.set('transactionId', filters.transactionId);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  return params;
}

export interface DateRangeFilters {
  from?: string;
  to?: string;
}

function toDateRangeSearchParams(dateRange: DateRangeFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (dateRange.from) params.set('from', dateRange.from);
  if (dateRange.to) params.set('to', dateRange.to);
  return params;
}

/** `dateRange` is the same from/to the date-range picker (now shared across the widget charts
 *  and the table, see SearchHero.tsx) applies to the table via `fetchExceptions` -- summary counts
 *  and financial impact narrow to the same window. */
export async function fetchSummary(dateRange: DateRangeFilters = {}): Promise<SummaryDto> {
  const res = await apiFetch<{ data: SummaryDto }>(
    `/api/reconciliation/summary?${toDateRangeSearchParams(dateRange)}`,
  );
  return res.data;
}

/** Settlement-side vs ledger-side totals per currency, across every checked transaction (not
 *  just exceptions) -- backs the financial-impact-by-currency widget. Same `dateRange` as
 *  `fetchSummary`. */
export async function fetchCurrencyTotals(
  dateRange: DateRangeFilters = {},
): Promise<CurrencyTotalsDto[]> {
  const res = await apiFetch<{ data: CurrencyTotalsDto[] }>(
    `/api/reconciliation/summary/currency-totals?${toDateRangeSearchParams(dateRange)}`,
  );
  return res.data;
}

export function fetchExceptions(filters: ExceptionsFilters): Promise<ExceptionsListResponse> {
  return apiFetch<ExceptionsListResponse>(
    `/api/reconciliation/exceptions?${toSearchParams(filters)}`,
  );
}

export async function fetchExceptionById(transactionId: string): Promise<ExceptionDto> {
  const res = await apiFetch<{ data: ExceptionDto }>(
    `/api/reconciliation/exceptions/${encodeURIComponent(transactionId)}`,
  );
  return res.data;
}

/** Every checked transaction (matched + exceptions) -- Toolbar.tsx's "show matched transactions"
 *  checkbox. Same filters/pagination shape as `fetchExceptions`. */
export function fetchTransactions(filters: ExceptionsFilters): Promise<TransactionsListResponse> {
  return apiFetch<TransactionsListResponse>(
    `/api/reconciliation/transactions?${toSearchParams(filters)}`,
  );
}

export async function fetchTransactionById(transactionId: string): Promise<TransactionDto> {
  const res = await apiFetch<{ data: TransactionDto }>(
    `/api/reconciliation/transactions/${encodeURIComponent(transactionId)}`,
  );
  return res.data;
}

/**
 * Global search (docs/sessions/2026-09-08-epic17-search-and-inline-detail.md): matches across the
 * merchant's *entire* exception set, ignoring the table's current page/filters -- a different
 * query from `fetchExceptions`, not just an alternate filter on it. `matchType: 'intent'` means
 * nothing matched literally and `data` is the merchant's whole exception set instead (see
 * `SearchResultDto`) -- callers that only ever showed literal matches before must now check it
 * rather than assuming every non-empty `data` is a real keyword match.
 */
export function searchExceptions(query: string): Promise<SearchResultDto> {
  return apiFetch<SearchResultDto>(
    `/api/reconciliation/exceptions/search?q=${encodeURIComponent(query)}`,
  );
}

/**
 * Merchant-facing explanation for one exception. Backed by apps/api's `explanationService.ts`
 * (Phase 8): a `MockExplanationProvider` by default, with a guaranteed deterministic fallback
 * (`generatedBy: 'fallback'`) if the provider fails or its output looks unusable. Swapping in a
 * real LLM provider changes only which service builds this response, not its shape.
 */
export async function fetchExplanation(transactionId: string): Promise<ExplanationDto> {
  const res = await apiFetch<{ data: ExplanationDto }>(
    `/api/reconciliation/exceptions/${encodeURIComponent(transactionId)}/explanation`,
    { method: 'POST' },
  );
  return res.data;
}

/**
 * AI-generated (Claude, with a deterministic fallback -- see apps/api's `searchExplanationService.ts`)
 * summary of a search's matches: what was found, the financial impact, the most common exception
 * type. Re-runs the search server-side, so it's always grounded in the authoritative match set
 * rather than whatever the client happened to render.
 */
export async function explainSearch(query: string): Promise<SearchExplanationDto> {
  const res = await apiFetch<{ data: SearchExplanationDto }>(
    '/api/reconciliation/exceptions/search/explain',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query }),
    },
  );
  return res.data;
}

/**
 * Same filters/sort as the list, minus pagination -- the export always contains every matching
 * row, in the same order the merchant was looking at on screen.
 */
export function buildExportUrl(
  filters: Pick<ExceptionsFilters, 'reason' | 'from' | 'to' | 'transactionId'> &
    Partial<Pick<ExceptionsFilters, 'sortBy' | 'sortOrder'>>,
  format: ExportFormat = 'csv',
): string {
  const params = toSearchParams(filters);
  params.set('format', format);
  return `/api/reconciliation/exceptions/export?${params.toString()}`;
}
