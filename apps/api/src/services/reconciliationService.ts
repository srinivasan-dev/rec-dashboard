import {
  formatMinorUnitsAsDecimal,
  type ReconciliationException,
  type ReconciliationSummary,
} from '@rapyd-portal/shared';

import { getReconciliationResult } from '../repositories/csvReconciliationRepository';
import { MAX_SEARCH_RESULTS } from '../validation/exceptionsQuery';
import type { ExceptionsExportQuery, ExceptionsListQuery } from '../validation/exceptionsQuery';

export interface PaginatedExceptions {
  data: ReconciliationException[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

type ExceptionFilters = Pick<ExceptionsListQuery, 'reason' | 'from' | 'to'>;
type ExceptionSort = Pick<ExceptionsListQuery, 'sortBy' | 'sortOrder'>;

/** The date an exception is filtered/sorted by -- whichever side of the pair actually exists. */
function exceptionDate(exception: ReconciliationException): string {
  return exception.settlement?.transactionDate ?? exception.ledger?.transactionDate ?? '';
}

function matchesFilters(exception: ReconciliationException, filters: ExceptionFilters): boolean {
  if (filters.reason && exception.reason !== filters.reason) return false;
  const date = exceptionDate(exception);
  if (filters.from && date < filters.from) return false;
  if (filters.to && date > filters.to) return false;
  return true;
}

function compareExceptions(
  a: ReconciliationException,
  b: ReconciliationException,
  sortBy: ExceptionSort['sortBy'],
): number {
  switch (sortBy) {
    case 'transactionDate':
      return exceptionDate(a).localeCompare(exceptionDate(b));
    case 'transactionId':
      return a.transactionId.localeCompare(b.transactionId);
    case 'reason':
      return a.reason.localeCompare(b.reason);
    case 'differenceAmount':
      return (a.differenceMinorUnits ?? 0) - (b.differenceMinorUnits ?? 0);
  }
}

export function getSummary(merchantId: string): ReconciliationSummary {
  return getReconciliationResult(merchantId).summary;
}

function sortExceptions(
  exceptions: ReconciliationException[],
  sort: ExceptionSort,
): ReconciliationException[] {
  return [...exceptions].sort((a, b) => {
    const comparison = compareExceptions(a, b, sort.sortBy);
    return sort.sortOrder === 'desc' ? -comparison : comparison;
  });
}

export function listExceptions(
  merchantId: string,
  query: ExceptionsListQuery,
): PaginatedExceptions {
  const { exceptions } = getReconciliationResult(merchantId);
  const filtered = exceptions.filter((exception) => matchesFilters(exception, query));
  const sorted = sortExceptions(filtered, query);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const start = (query.page - 1) * query.pageSize;

  return {
    data: sorted.slice(start, start + query.pageSize),
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages },
  };
}

/**
 * Looked up by merchantId + transactionId, same as the reconciliation engine's key -- a
 * transactionId that exists only for a *different* merchant correctly returns undefined here,
 * never that merchant's data (see docs/architecture.md §4).
 */
export function getExceptionById(
  merchantId: string,
  transactionId: string,
): ReconciliationException | null {
  const { exceptions } = getReconciliationResult(merchantId);
  return exceptions.find((exception) => exception.transactionId === transactionId) ?? null;
}

export function listExceptionsForExport(
  merchantId: string,
  filters: ExceptionsExportQuery,
): ReconciliationException[] {
  const { exceptions } = getReconciliationResult(merchantId);
  const filtered = exceptions.filter((exception) => matchesFilters(exception, filters));
  return sortExceptions(filtered, filters);
}

/**
 * Global search: matches transaction id, reason code, currency, or any of the settlement/ledger/
 * difference amounts (as the same decimal strings the UI displays), case-insensitively. Not the
 * merchant-facing reason label (e.g. "Duplicate entry") -- the raw reason code already covers the
 * intuitive search terms ("duplicate" -> DUPLICATE_LEDGER, "settlement" -> MISSING_SETTLEMENT,
 * "mismatch" -> AMOUNT_MISMATCH/DATE_MISMATCH/CURRENCY_MISMATCH) without duplicating apps/web's
 * label copy on the backend. Capped at MAX_SEARCH_RESULTS -- a real search box, not an unbounded
 * dump -- sorted by transaction date like every other list in this app.
 */
export function searchExceptions(merchantId: string, query: string): ReconciliationException[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { exceptions } = getReconciliationResult(merchantId);
  const matched = exceptions.filter((exception) => matchesSearch(exception, q));
  const sorted = sortExceptions(matched, { sortBy: 'transactionDate', sortOrder: 'asc' });
  return sorted.slice(0, MAX_SEARCH_RESULTS);
}

/**
 * Every exception on the merchant's account, unfiltered -- used only as the candidate pool for
 * the search-explanation "intent" fallback (searchExplanationService.ts) when a merchant's vague,
 * natural-language question ("why isn't my money showing up?") doesn't literally keyword-match
 * anything via `searchExceptions`. Still merchant-scoped the same way every other read here is.
 */
export function listAllExceptions(merchantId: string): ReconciliationException[] {
  const { exceptions } = getReconciliationResult(merchantId);
  return sortExceptions(exceptions, { sortBy: 'transactionDate', sortOrder: 'asc' });
}

export interface SearchResult {
  data: ReconciliationException[];
  /**
   * 'literal': `data` is the real keyword-match result (may be empty).
   * 'intent': the query didn't literally match anything, so `data` is the merchant's *entire*
   * exception set instead -- the same candidate pool the search-explain "intent" mode hands to
   * the AI summary (searchExplanationProvider.ts), so the table and the chat panel are always
   * looking at identical data for a vague/natural-language query rather than the table going
   * blank while the chat still talks about specific transactions.
   */
  matchType: 'literal' | 'intent';
}

/**
 * The one place that decides "what should a merchant see for this query" -- both
 * `GET /exceptions/search` (the table/highlighting) and `POST /exceptions/search/explain` (the
 * AI summary) call this rather than each deciding independently whether to fall back to the full
 * exception set, so the two can never disagree about what a given query matched.
 */
export function searchExceptionsOrAll(merchantId: string, query: string): SearchResult {
  const literal = searchExceptions(merchantId, query);
  if (literal.length > 0) {
    return { data: literal, matchType: 'literal' };
  }
  return { data: listAllExceptions(merchantId), matchType: 'intent' };
}

function matchesSearch(exception: ReconciliationException, q: string): boolean {
  if (exception.transactionId.toLowerCase().includes(q)) return true;
  if (exception.reason.toLowerCase().includes(q)) return true;
  if (exception.currency.toLowerCase().includes(q)) return true;

  const amounts = [
    exception.settlement
      ? formatMinorUnitsAsDecimal(exception.settlement.netAmountMinorUnits)
      : null,
    exception.ledger ? formatMinorUnitsAsDecimal(exception.ledger.amountMinorUnits) : null,
    exception.differenceMinorUnits === null
      ? null
      : formatMinorUnitsAsDecimal(exception.differenceMinorUnits),
  ];
  return amounts.some((amount) => amount !== null && amount.toLowerCase().includes(q));
}
