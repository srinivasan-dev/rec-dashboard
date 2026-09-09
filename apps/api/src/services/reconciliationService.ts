import {
  buildSummary,
  formatMinorUnitsAsDecimal,
  hasNoFinancialImpact,
  type MatchedTransaction,
  type ReconciliationException,
  type ReconciliationSummary,
} from '@rapyd-portal/shared';

import { getReconciliationResult } from '../repositories/csvReconciliationRepository';
import { MAX_SEARCH_RESULTS } from '../validation/exceptionsQuery';
import { isKnowledgeBaseQuery } from './knowledgeBase';
import type {
  DateRangeQuery,
  ExceptionsExportQuery,
  ExceptionsListQuery,
} from '../validation/exceptionsQuery';

export interface PaginatedExceptions {
  data: ReconciliationException[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

type ExceptionFilters = Pick<ExceptionsListQuery, 'reason' | 'from' | 'to' | 'transactionId'>;
type ExceptionSort = Pick<ExceptionsListQuery, 'sortBy' | 'sortOrder'>;

/** The date an exception is filtered/sorted by -- whichever side of the pair actually exists. */
function exceptionDate(exception: ReconciliationException): string {
  return exception.settlement?.transactionDate ?? exception.ledger?.transactionDate ?? '';
}

/** A matched transaction always has both sides, and reconcile.ts's DATE_MISMATCH rule guarantees
 *  they agree on date before a pair can ever reach "matched" -- either side's date is correct. */
function matchedDate(transaction: MatchedTransaction): string {
  return transaction.settlement.transactionDate;
}

function inDateRange(date: string, range: DateRangeQuery): boolean {
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

function matchesFilters(exception: ReconciliationException, filters: ExceptionFilters): boolean {
  if (filters.reason && exception.reason !== filters.reason) return false;
  if (
    filters.transactionId &&
    !exception.transactionId.toLowerCase().includes(filters.transactionId.toLowerCase())
  ) {
    return false;
  }
  return inDateRange(exceptionDate(exception), filters);
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

/**
 * `dateRange` empty (both `from`/`to` undefined) returns the exact same summary as the cached
 * `ReconciliationResult` -- no need to rebuild it from an unfiltered copy of `matched`/
 * `exceptions`. Once a range is given, `buildSummary` (packages/shared/reconcile.ts) recomputes
 * from the filtered subset, so a date-filtered summary is produced by the same deterministic
 * aggregation `reconcile` itself uses, not a second implementation that could drift from it.
 */
export function getSummary(
  merchantId: string,
  dateRange: DateRangeQuery = {},
): ReconciliationSummary {
  const result = getReconciliationResult(merchantId);
  if (!dateRange.from && !dateRange.to) return result.summary;

  const matched = result.matched.filter((transaction) =>
    inDateRange(matchedDate(transaction), dateRange),
  );
  const exceptions = result.exceptions.filter((exception) =>
    inDateRange(exceptionDate(exception), dateRange),
  );
  return buildSummary(merchantId, matched, exceptions);
}

export interface CurrencyTotals {
  currency: string;
  settlementMinorUnits: number;
  ledgerMinorUnits: number;
  /** Count of this currency's exceptions whose reason has no computable dollar figure
   *  (`hasNoFinancialImpact` -- duplicate entries, date mismatches, currency mismatches). Lets the
   *  dashboard's financial-impact widget flag "there's still an open exception here" even for a
   *  currency whose settled/yet-to-receive totals alone would otherwise look fully reconciled. */
  noImpactExceptionCount: number;
}

/**
 * Settlement-side vs ledger-side totals per currency, across every checked transaction (matched
 * and exceptions alike) -- not just the exceptions' financial impact (which is already covered by
 * `getSummary().financialImpactByCurrency`). Used by the dashboard's financial-impact-by-currency
 * widget to show the full settlement/ledger volume per currency, not just what's currently in
 * dispute. Summed in integer minor units throughout (docs/architecture.md §8) -- only converted
 * to a decimal string at the serializer boundary. `dateRange` applies the same from/to filter
 * `getSummary` does, so the dashboard's date-range picker drives this widget too.
 */
export function getCurrencyTotals(
  merchantId: string,
  dateRange: DateRangeQuery = {},
): CurrencyTotals[] {
  const result = getReconciliationResult(merchantId);
  const matched = result.matched.filter((transaction) =>
    inDateRange(matchedDate(transaction), dateRange),
  );
  const exceptions = result.exceptions.filter((exception) =>
    inDateRange(exceptionDate(exception), dateRange),
  );
  const totalsByCurrency = new Map<string, CurrencyTotals>();

  const entryFor = (currency: string): CurrencyTotals => {
    const entry = totalsByCurrency.get(currency) ?? {
      currency,
      settlementMinorUnits: 0,
      ledgerMinorUnits: 0,
      noImpactExceptionCount: 0,
    };
    totalsByCurrency.set(currency, entry);
    return entry;
  };

  const add = (currency: string, side: 'settlement' | 'ledger', amountMinorUnits: number): void => {
    const entry = entryFor(currency);
    if (side === 'settlement') entry.settlementMinorUnits += amountMinorUnits;
    else entry.ledgerMinorUnits += amountMinorUnits;
  };

  for (const transaction of matched) {
    add(transaction.currency, 'settlement', transaction.settlement.netAmountMinorUnits);
    add(transaction.currency, 'ledger', transaction.ledger.amountMinorUnits);
  }
  for (const exception of exceptions) {
    if (exception.settlement) {
      add(exception.currency, 'settlement', exception.settlement.netAmountMinorUnits);
    }
    // A duplicate ledger entry is intentionally counted once here (exception.ledger, the first
    // entry -- see reconcile.ts's DUPLICATE_LEDGER rule), not once per duplicateLedgerEntries
    // row, so this total isn't inflated by the very problem the exception is flagging.
    if (exception.ledger) {
      add(exception.currency, 'ledger', exception.ledger.amountMinorUnits);
    }
    if (hasNoFinancialImpact(exception.reason)) {
      entryFor(exception.currency).noImpactExceptionCount += 1;
    }
  }

  return [...totalsByCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
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

/**
 * A row for GET /transactions -- either an already-decided exception or a matched transaction,
 * unified so the table view can list both together (Toolbar.tsx's "show matched transactions"
 * checkbox). Kept as a small tagged union of the two *existing* domain types rather than a new
 * merged shape, so nothing about how exceptions/matches are computed changes -- this is purely an
 * additional read path over the same `ReconciliationResult`.
 */
export type Transaction =
  | { kind: 'exception'; exception: ReconciliationException }
  | { kind: 'matched'; matched: MatchedTransaction };

export interface PaginatedTransactions {
  data: Transaction[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

function transactionDateOf(item: Transaction): string {
  return item.kind === 'exception' ? exceptionDate(item.exception) : matchedDate(item.matched);
}

function transactionIdOf(item: Transaction): string {
  return item.kind === 'exception' ? item.exception.transactionId : item.matched.transactionId;
}

/** Sort key for the "Reason" column -- a matched row has no `ExceptionReason`, so it sorts under
 *  the literal string "MATCHED" (wherever that lands alphabetically); no other meaning intended. */
function transactionReasonSortKeyOf(item: Transaction): string {
  return item.kind === 'exception' ? item.exception.reason : 'MATCHED';
}

/** A matched pair has no difference by definition -- 0, same as how `compareExceptions` already
 *  treats every exception reason that has no `differenceMinorUnits` of its own. */
function transactionDifferenceOf(item: Transaction): number {
  return item.kind === 'exception' ? (item.exception.differenceMinorUnits ?? 0) : 0;
}

function matchesTransactionFilters(item: Transaction, filters: ExceptionFilters): boolean {
  // A reason filter only ever matches exceptions -- a matched row has no reason to compare
  // against, so it's excluded whenever a specific reason is asked for.
  if (filters.reason) {
    if (item.kind !== 'exception' || item.exception.reason !== filters.reason) return false;
  }
  if (
    filters.transactionId &&
    !transactionIdOf(item).toLowerCase().includes(filters.transactionId.toLowerCase())
  ) {
    return false;
  }
  return inDateRange(transactionDateOf(item), filters);
}

function compareTransactions(
  a: Transaction,
  b: Transaction,
  sortBy: ExceptionSort['sortBy'],
): number {
  switch (sortBy) {
    case 'transactionDate':
      return transactionDateOf(a).localeCompare(transactionDateOf(b));
    case 'transactionId':
      return transactionIdOf(a).localeCompare(transactionIdOf(b));
    case 'reason':
      return transactionReasonSortKeyOf(a).localeCompare(transactionReasonSortKeyOf(b));
    case 'differenceAmount':
      return transactionDifferenceOf(a) - transactionDifferenceOf(b);
  }
}

function sortTransactions(items: Transaction[], sort: ExceptionSort): Transaction[] {
  return [...items].sort((a, b) => {
    const comparison = compareTransactions(a, b, sort.sortBy);
    return sort.sortOrder === 'desc' ? -comparison : comparison;
  });
}

/**
 * Every checked transaction -- matched and exceptions together -- for Toolbar.tsx's "show matched
 * transactions" checkbox. Same filter/sort/pagination shape as `listExceptions` (reused
 * `ExceptionsListQuery`) so the table's existing controls (column-header sort, transaction-id
 * search, date range) work identically whichever endpoint is backing it.
 */
export function listTransactions(
  merchantId: string,
  query: ExceptionsListQuery,
): PaginatedTransactions {
  const { matched, exceptions } = getReconciliationResult(merchantId);
  const items: Transaction[] = [
    ...matched.map((item): Transaction => ({ kind: 'matched', matched: item })),
    ...exceptions.map((item): Transaction => ({ kind: 'exception', exception: item })),
  ];

  const filtered = items.filter((item) => matchesTransactionFilters(item, query));
  const sorted = sortTransactions(filtered, query);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const start = (query.page - 1) * query.pageSize;

  return {
    data: sorted.slice(start, start + query.pageSize),
    pagination: { page: query.page, pageSize: query.pageSize, total, totalPages },
  };
}

/** Same merchant-scoped, key-based lookup as `getExceptionById`, just over the wider matched-or-
 *  exception union -- a transactionId is at most one of the two, never both. */
export function getTransactionById(merchantId: string, transactionId: string): Transaction | null {
  const { matched, exceptions } = getReconciliationResult(merchantId);
  const exception = exceptions.find((item) => item.transactionId === transactionId);
  if (exception) return { kind: 'exception', exception };
  const matchedTransaction = matched.find((item) => item.transactionId === transactionId);
  if (matchedTransaction) return { kind: 'matched', matched: matchedTransaction };
  return null;
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
 * Common words in the UI's own suggested prompts ("Show me duplicate entries", "Amount
 * mismatches") that carry no search meaning on their own -- excluded from tokenizing so a phrase
 * match rests on its actual keyword ("duplicate", "mismatches") rather than failing outright
 * because the literal multi-word phrase isn't a substring of anything.
 */
const SEARCH_STOPWORDS = new Set([
  'the',
  'is',
  'are',
  'my',
  'me',
  'not',
  'need',
  'needs',
  'which',
  'what',
  'why',
  'how',
  'for',
  'and',
  'with',
  'this',
  'that',
  'show',
  'has',
  'have',
  'do',
  'does',
  'did',
  'to',
  'of',
  'in',
  'up',
  'showing',
  'transactions',
  'transaction',
  'review',
]);

/** Splits a query into its individually-meaningful words -- see `SEARCH_STOPWORDS`. */
function searchTokens(q: string): string[] {
  return q
    .split(/\s+/)
    .map((word) => word.replace(/[?.,!]+$/, ''))
    .filter((word) => word.length >= 3 && !SEARCH_STOPWORDS.has(word));
}

/**
 * Global search: matches transaction id, reason code, currency, or any of the settlement/ledger/
 * difference amounts (as the same decimal strings the UI displays), case-insensitively. Not the
 * merchant-facing reason label (e.g. "Duplicate entry") -- the raw reason code already covers the
 * intuitive search terms ("duplicate" -> DUPLICATE_LEDGER, "settlement" -> MISSING_SETTLEMENT,
 * "mismatch" -> AMOUNT_MISMATCH/DATE_MISMATCH/CURRENCY_MISMATCH) without duplicating apps/web's
 * label copy on the backend.
 *
 * Matched per-token, not as one literal phrase: a query like "Show me duplicate entries" (one of
 * apps/web's own suggested prompts) is never a substring of "DUPLICATE_LEDGER", so matching the
 * whole phrase always failed and fell through to `searchExceptionsOrAll`'s intent-mode fallback --
 * dumping every exception instead of just the one duplicate. Splitting into words and matching if
 * *any* meaningful one hits keeps genuinely vague queries ("Why is my money not showing up?")
 * falling to intent mode as intended, while a phrase built around one real keyword now matches
 * only what it names. Capped at MAX_SEARCH_RESULTS -- a real search box, not an unbounded dump --
 * sorted by transaction date like every other list in this app.
 */
export function searchExceptions(merchantId: string, query: string): ReconciliationException[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = searchTokens(q);
  if (tokens.length === 0) return [];

  const { exceptions } = getReconciliationResult(merchantId);
  const matched = exceptions.filter((exception) =>
    tokens.some((token) => matchesSearch(exception, token)),
  );
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
   * 'intent': the query didn't literally match anything, but it still plausibly relates to
   * reconciliation (mentions an amount, a transaction-id-shaped token, a currency, or a domain
   * word like "settlement"/"duplicate"), so `data` is the merchant's *entire* exception set
   * instead -- the same candidate pool the search-explain "intent" mode hands to the AI summary
   * (searchExplanationProvider.ts), so the table and the chat panel are always looking at
   * identical data for a vague/natural-language query rather than the table going blank while
   * the chat still talks about specific transactions.
   * 'off-topic': the query doesn't literally match anything AND has no plausible connection to
   * reconciliation at all (e.g. "what is the capital of Japan") -- `data` is empty rather than
   * dumping the merchant's whole exception set behind an unrelated question.
   * 'knowledge-base': the query matches a mocked FAQ answer (knowledgeBase.ts -- e.g. "how long
   * does a duplicate-entry refund take?") rather than asking about the merchant's own account --
   * `data` is empty; the search-explain response is the canned FAQ answer instead of an AI
   * summary or an account dump.
   */
  matchType: 'literal' | 'intent' | 'off-topic' | 'knowledge-base';
}

/**
 * Words whose presence makes a non-literal-matching query plausibly still about reconciliation --
 * checked before falling back to "dump the whole account" for a vague query, so a genuinely
 * unrelated question (see `isPlausiblyReconciliationRelated`) doesn't get the same treatment as
 * "why isn't my money showing up?".
 */
const RECONCILIATION_TOPIC_WORDS = new Set([
  'transaction',
  'transactions',
  'exception',
  'exceptions',
  'ledger',
  'settlement',
  'settlements',
  'amount',
  'amounts',
  'reason',
  'reasons',
  'currency',
  'currencies',
  'refund',
  'refunds',
  'payment',
  'payments',
  'reconcile',
  'reconciled',
  'reconciliation',
  'match',
  'matches',
  'matching',
  'missing',
  'duplicate',
  'duplicates',
  'date',
  'dates',
  'review',
  'account',
  'record',
  'records',
  'fund',
  'funds',
  'pending',
  'status',
  'export',
  'report',
  'discrepancy',
  'discrepancies',
  'balance',
  'invoice',
  'invoices',
  'fee',
  'fees',
  'charge',
  'charges',
  'dispute',
  'disputes',
  'chargeback',
  'chargebacks',
  'batch',
  'payout',
  'payouts',
  'gateway',
  'money',
  'paid',
  'pay',
  'owe',
  'owed',
  'received',
  'receive',
  'mismatch',
  'aed',
  'usd',
  'eur',
  'gbp',
  'financial',
  'impact',
  'total',
  'summary',
  'summarize',
]);

/**
 * A deliberately generous heuristic, not a true intent classifier: a query counts as plausibly
 * reconciliation-related if it contains any digit (covers amounts, dates, and transaction ids
 * like "T1006") or any word from `RECONCILIATION_TOPIC_WORDS`. Anything that clears neither bar
 * (e.g. "what is the capital of Japan") is treated as off-topic -- see `SearchResult.matchType`.
 */
function isPlausiblyReconciliationRelated(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (/\d/.test(trimmed)) return true;
  const words = trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z]/g, ''));
  return words.some((word) => RECONCILIATION_TOPIC_WORDS.has(word));
}

/**
 * The one place that decides "what should a merchant see for this query" -- both
 * `GET /exceptions/search` (the table/highlighting) and `POST /exceptions/search/explain` (the
 * AI summary) call this rather than each deciding independently whether to fall back to the full
 * exception set, so the two can never disagree about what a given query matched.
 */
export function searchExceptionsOrAll(merchantId: string, query: string): SearchResult {
  // Checked before the literal keyword search, not after: a question like "how long does a
  // duplicate entry refund take?" contains "duplicate", which would otherwise literally match
  // every DUPLICATE_LEDGER exception's reason code and get treated as a transaction search
  // instead of the FAQ question it actually is.
  if (isKnowledgeBaseQuery(query)) {
    return { data: [], matchType: 'knowledge-base' };
  }
  const literal = searchExceptions(merchantId, query);
  if (literal.length > 0) {
    return { data: literal, matchType: 'literal' };
  }
  if (!isPlausiblyReconciliationRelated(query)) {
    return { data: [], matchType: 'off-topic' };
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
