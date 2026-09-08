import type {
  ExceptionReason,
  FinancialImpact,
  LedgerRecord,
  MatchedTransaction,
  ReconciliationException,
  ReconciliationResult,
  ReconciliationSummary,
  SettlementRecord,
} from './types';

/**
 * Reconciliation key. Deliberately merchantId + transactionId, never transactionId alone —
 * transaction IDs are not guaranteed unique across merchants (see docs/architecture.md §9 /
 * docs/product-spec.md assumption 3). Using this composite key end to end is what makes
 * multi-merchant isolation a structural property of the engine rather than something callers
 * have to remember to enforce.
 */
function reconciliationKey(merchantId: string, transactionId: string): string {
  return `${merchantId}::${transactionId}`;
}

function groupByKey<T extends { merchantId: string; transactionId: string }>(
  records: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const record of records) {
    const key = reconciliationKey(record.merchantId, record.transactionId);
    const existing = map.get(key);
    if (existing) {
      existing.push(record);
    } else {
      map.set(key, [record]);
    }
  }
  return map;
}

const EXCEPTION_REASONS: ExceptionReason[] = [
  'MISSING_LEDGER',
  'MISSING_SETTLEMENT',
  'DUPLICATE_LEDGER',
  'AMOUNT_MISMATCH',
  'DATE_MISMATCH',
  'CURRENCY_MISMATCH',
];

function emptyExceptionCounts(): Record<ExceptionReason, number> {
  const counts = {} as Record<ExceptionReason, number>;
  for (const reason of EXCEPTION_REASONS) counts[reason] = 0;
  return counts;
}

/** Lowest ledgerId first, so "the first entry" is a deterministic, stable choice. */
function byLedgerIdAscending(a: LedgerRecord, b: LedgerRecord): number {
  return a.ledgerId.localeCompare(b.ledgerId);
}

/**
 * Reconciles settlement and ledger records for every merchant present in the input, keyed by
 * merchantId + transactionId. Never hardcodes a merchant ID or an expected exception — the same
 * logic runs identically regardless of which merchants or transactions are present.
 *
 * ## Rule precedence (per key), and why
 *
 * At most one exception is produced per (merchantId, transactionId). When multiple problems
 * could apply, this is the order they're checked in, first match wins:
 *
 * 1. **DUPLICATE_LEDGER** — more than one ledger entry for this key. Checked first and
 *    exclusively: if we instead ran amount/date comparisons against *each* duplicate entry (a
 *    naive join), one real problem (an accidental double-entry) would surface as multiple
 *    unrelated-looking exceptions, or worse, mask itself if one duplicate happens to match and
 *    the other doesn't. One structural problem, one exception.
 * 2. **MISSING_LEDGER** / **MISSING_SETTLEMENT** — one side has no record at all. There's
 *    nothing to compare amounts or dates against, so no lower-priority rule can apply anyway;
 *    listed second only because duplicate-detection needs to run first when both a duplicate
 *    *and* a missing counterpart could theoretically coexist in bad data.
 * 3. **CURRENCY_MISMATCH** — checked before amount comparison because comparing minor-unit
 *    amounts across different currencies is meaningless (267.80 USD vs 267.80 AED are not "off
 *    by zero"). Evaluated defensively even though the current M-104 data never triggers it.
 * 4. **AMOUNT_MISMATCH** — the settlement's net amount (post-fee — what the merchant actually
 *    receives, see docs/product-spec.md assumption 4) differs from the ledger amount.
 * 5. **DATE_MISMATCH** — amounts and currency agree but the transaction dates differ.
 *
 * If none of the above apply, the transaction is matched.
 */
export function reconcile(
  settlements: SettlementRecord[],
  ledgerEntries: LedgerRecord[],
): Map<string, ReconciliationResult> {
  const settlementsByKey = groupByKey(settlements);
  const ledgerByKey = groupByKey(ledgerEntries);

  const allKeys = new Set<string>([...settlementsByKey.keys(), ...ledgerByKey.keys()]);

  const resultsByMerchant = new Map<
    string,
    { matched: MatchedTransaction[]; exceptions: ReconciliationException[] }
  >();

  const ensureMerchantBucket = (merchantId: string) => {
    const existing = resultsByMerchant.get(merchantId);
    if (existing) return existing;
    const bucket = {
      matched: [] as MatchedTransaction[],
      exceptions: [] as ReconciliationException[],
    };
    resultsByMerchant.set(merchantId, bucket);
    return bucket;
  };

  for (const key of allKeys) {
    const settlementEntries = settlementsByKey.get(key) ?? [];
    const ledgerEntriesForKey = [...(ledgerByKey.get(key) ?? [])].sort(byLedgerIdAscending);

    // settlementEntries/ledgerEntriesForKey share the same merchantId within a key by
    // construction (the key encodes it) — safe to read merchantId off whichever side exists.
    const merchantId = (settlementEntries[0] ?? ledgerEntriesForKey[0])!.merchantId;
    const transactionId = (settlementEntries[0] ?? ledgerEntriesForKey[0])!.transactionId;
    const bucket = ensureMerchantBucket(merchantId);

    // Rule 1: DUPLICATE_LEDGER — checked first, see precedence note above.
    if (ledgerEntriesForKey.length > 1) {
      const settlement = settlementEntries[0] ?? null;
      bucket.exceptions.push({
        merchantId,
        transactionId,
        reason: 'DUPLICATE_LEDGER',
        currency: settlement?.currency ?? ledgerEntriesForKey[0]!.currency,
        settlement,
        ledger: ledgerEntriesForKey[0]!,
        duplicateLedgerEntries: ledgerEntriesForKey,
        differenceMinorUnits: null,
      });
      continue;
    }

    const settlement = settlementEntries[0] ?? null;
    const ledger = ledgerEntriesForKey[0] ?? null;

    // Rule 2a: MISSING_LEDGER
    if (settlement && !ledger) {
      bucket.exceptions.push({
        merchantId,
        transactionId,
        reason: 'MISSING_LEDGER',
        currency: settlement.currency,
        settlement,
        ledger: null,
        duplicateLedgerEntries: null,
        differenceMinorUnits: null,
      });
      continue;
    }

    // Rule 2b: MISSING_SETTLEMENT
    if (!settlement && ledger) {
      bucket.exceptions.push({
        merchantId,
        transactionId,
        reason: 'MISSING_SETTLEMENT',
        currency: ledger.currency,
        settlement: null,
        ledger,
        duplicateLedgerEntries: null,
        differenceMinorUnits: null,
      });
      continue;
    }

    // Both sides present, exactly one entry each, from here on.
    if (!settlement || !ledger) continue; // unreachable, narrows types for TS

    // Rule 3: CURRENCY_MISMATCH
    if (settlement.currency !== ledger.currency) {
      bucket.exceptions.push({
        merchantId,
        transactionId,
        reason: 'CURRENCY_MISMATCH',
        currency: settlement.currency,
        settlement,
        ledger,
        duplicateLedgerEntries: null,
        differenceMinorUnits: null,
      });
      continue;
    }

    // Rule 4: AMOUNT_MISMATCH — compare settlement net (post-fee) against ledger amount.
    if (settlement.netAmountMinorUnits !== ledger.amountMinorUnits) {
      bucket.exceptions.push({
        merchantId,
        transactionId,
        reason: 'AMOUNT_MISMATCH',
        currency: settlement.currency,
        settlement,
        ledger,
        duplicateLedgerEntries: null,
        differenceMinorUnits: Math.abs(settlement.netAmountMinorUnits - ledger.amountMinorUnits),
      });
      continue;
    }

    // Rule 5: DATE_MISMATCH
    if (settlement.transactionDate !== ledger.transactionDate) {
      bucket.exceptions.push({
        merchantId,
        transactionId,
        reason: 'DATE_MISMATCH',
        currency: settlement.currency,
        settlement,
        ledger,
        duplicateLedgerEntries: null,
        differenceMinorUnits: null,
      });
      continue;
    }

    // Matched.
    bucket.matched.push({
      merchantId,
      transactionId,
      currency: settlement.currency,
      settlement,
      ledger,
    });
  }

  const results = new Map<string, ReconciliationResult>();
  for (const [merchantId, bucket] of resultsByMerchant) {
    results.set(merchantId, {
      merchantId,
      matched: bucket.matched,
      exceptions: bucket.exceptions,
      summary: buildSummary(merchantId, bucket.matched, bucket.exceptions),
    });
  }
  return results;
}

/** Convenience wrapper for the common case of reconciling a single known merchant. */
export function reconcileMerchant(
  settlements: SettlementRecord[],
  ledgerEntries: LedgerRecord[],
  merchantId: string,
): ReconciliationResult {
  const all = reconcile(settlements, ledgerEntries);
  return (
    all.get(merchantId) ?? {
      merchantId,
      matched: [],
      exceptions: [],
      summary: buildSummary(merchantId, [], []),
    }
  );
}

/**
 * Whether an exception reason has a quantifiable financial amount at stake. DUPLICATE_LEDGER
 * and DATE_MISMATCH don't — a duplicate entry's "impact" is ambiguous (is the money doubled or
 * not? that requires human judgment, not a number), and a date-only difference has no amount
 * discrepancy by definition. Reporting a number for either would manufacture false precision.
 * See docs/product-spec.md §15 (risk: misleading merchants about financial impact).
 */
function financialImpactFor(exception: ReconciliationException): FinancialImpact | null {
  switch (exception.reason) {
    case 'AMOUNT_MISMATCH':
      return { currency: exception.currency, amountMinorUnits: exception.differenceMinorUnits! };
    case 'MISSING_LEDGER':
      return {
        currency: exception.currency,
        amountMinorUnits: exception.settlement!.netAmountMinorUnits,
      };
    case 'MISSING_SETTLEMENT':
      return { currency: exception.currency, amountMinorUnits: exception.ledger!.amountMinorUnits };
    case 'DUPLICATE_LEDGER':
    case 'DATE_MISMATCH':
    case 'CURRENCY_MISMATCH':
      return null;
  }
}

function buildSummary(
  merchantId: string,
  matched: MatchedTransaction[],
  exceptions: ReconciliationException[],
): ReconciliationSummary {
  const exceptionsByReason = emptyExceptionCounts();
  const impactByCurrency = new Map<string, number>();

  for (const exception of exceptions) {
    exceptionsByReason[exception.reason] += 1;

    const impact = financialImpactFor(exception);
    if (impact) {
      impactByCurrency.set(
        impact.currency,
        (impactByCurrency.get(impact.currency) ?? 0) + impact.amountMinorUnits,
      );
    }
  }

  return {
    merchantId,
    totalChecked: matched.length + exceptions.length,
    matchedCount: matched.length,
    exceptionCount: exceptions.length,
    exceptionsByReason,
    financialImpactByCurrency: [...impactByCurrency.entries()].map(
      ([currency, amountMinorUnits]) => ({
        currency,
        amountMinorUnits,
      }),
    ),
  };
}
