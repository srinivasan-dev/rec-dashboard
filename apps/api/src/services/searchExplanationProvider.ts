import { formatMinorUnitsAsDecimal, type ReconciliationException } from '@rapyd-portal/shared';

import { buildExplanationContext, type ExplanationContext } from './explanationProvider';

/** How many individual matches get their full facts spelled out in the prompt -- the aggregate
 *  counts/impact below cover the full match set regardless of this cap, so the model never has
 *  to guess at totals it wasn't shown; it only ever narrates the sample it *was* shown plus the
 *  numbers computed here in code. */
const MAX_SAMPLE_FACTS = 8;

/**
 * Same reasoning as `reconcile.ts`'s `financialImpactFor` (not exported from packages/shared, so
 * duplicated narrowly here rather than widening that package's public surface for one caller):
 * DUPLICATE_LEDGER and DATE_MISMATCH have no quantifiable amount at stake, so they're excluded
 * from the aggregate impact -- reporting a number for either would manufacture false precision.
 */
function financialImpactMinorUnitsFor(exception: ReconciliationException): number | null {
  switch (exception.reason) {
    case 'AMOUNT_MISMATCH':
      return exception.differenceMinorUnits;
    case 'MISSING_LEDGER':
      return exception.settlement?.netAmountMinorUnits ?? null;
    case 'MISSING_SETTLEMENT':
      return exception.ledger?.amountMinorUnits ?? null;
    case 'DUPLICATE_LEDGER':
    case 'DATE_MISMATCH':
    case 'CURRENCY_MISMATCH':
      return null;
  }
}

export interface SearchExplanationContext {
  query: string;
  /**
   * 'literal': `query` keyword-matched these exceptions via `searchExceptions` -- the usual case.
   * 'intent': it matched nothing literally, so the merchant's question is being treated as a
   * vague/natural-language one (e.g. "why isn't my money showing up?") and the aggregate
   * counts/sample below describe the merchant's *entire* exception set instead, for the provider
   * to interpret against -- see `searchExplanationService.ts`'s controller-side fallback. Either
   * way the provider only ever sees already-decided facts; this only changes what it's told those
   * facts represent.
   */
  mode: 'literal' | 'intent';
  totalMatchCount: number;
  reasonCounts: Partial<Record<ReconciliationException['reason'], number>>;
  financialImpactByCurrency: { currency: string; amount: string }[];
  /** Full per-transaction facts for up to `MAX_SAMPLE_FACTS` matches -- same shape a single-
   *  exception explanation is grounded in, so this feature inherits the identical guarantee: the
   *  provider can only talk about transactions/amounts/dates it was actually handed. */
  sample: ExplanationContext[];
}

export interface SearchExplanationProvider {
  /** Identifies the provider in the response's `generatedBy` field (e.g. 'claude', 'fallback'). */
  readonly id: string;
  explainSearch(context: SearchExplanationContext): Promise<string>;
}

export const SEARCH_EXPLANATION_SYSTEM_INTENT =
  'You summarize a merchant’s search results in a payment reconciliation dashboard, in clear ' +
  'factual language. Only use supplied information. Never speculate about missing funds, fraud, ' +
  'liability, or settlement timing when it is not supported by the provided data. Do not invent ' +
  'transactions, amounts, dates, or counts beyond what is supplied.';

/** Turns the already-decided matches for a search query into the structured facts a provider is
 *  allowed to see -- aggregate counts/impact computed deterministically in code (never by the
 *  model), plus a bounded sample of individual transaction facts for concrete grounding. */
export function buildSearchExplanationContext(
  query: string,
  matches: ReconciliationException[],
  mode: 'literal' | 'intent' = 'literal',
): SearchExplanationContext {
  const reasonCounts: Partial<Record<ReconciliationException['reason'], number>> = {};
  const impactByCurrency = new Map<string, number>();

  for (const exception of matches) {
    reasonCounts[exception.reason] = (reasonCounts[exception.reason] ?? 0) + 1;

    const impactMinorUnits = financialImpactMinorUnitsFor(exception);
    if (impactMinorUnits !== null) {
      impactByCurrency.set(
        exception.currency,
        (impactByCurrency.get(exception.currency) ?? 0) + impactMinorUnits,
      );
    }
  }

  return {
    query,
    mode,
    totalMatchCount: matches.length,
    reasonCounts,
    financialImpactByCurrency: [...impactByCurrency.entries()].map(([currency, minorUnits]) => ({
      currency,
      amount: formatMinorUnitsAsDecimal(minorUnits),
    })),
    sample: matches.slice(0, MAX_SAMPLE_FACTS).map(buildExplanationContext),
  };
}

function factLinesFor(context: ExplanationContext): string[] {
  return [
    `  - transactionId: ${context.transactionId}, reason: ${context.reason}, currency: ${context.currency}` +
      (context.settlement
        ? `, settlement: ${context.settlement.amount} on ${context.settlement.date}`
        : ', settlement: none on record') +
      (context.ledger
        ? `, ledger: ${context.ledger.amount} on ${context.ledger.date}`
        : ', ledger: none on record') +
      (context.differenceAmount !== null ? `, difference: ${context.differenceAmount}` : ''),
  ];
}

/**
 * The exact prompt sent to the real provider -- system intent + deterministic aggregate facts +
 * a bounded sample of individual transaction facts, nothing else. Unit-tested independent of any
 * provider, same as `explanationProvider.ts`'s `buildExplanationPrompt`.
 */
export function buildSearchExplanationPrompt(context: SearchExplanationContext): string {
  const reasonLines = Object.entries(context.reasonCounts).map(
    ([reason, count]) => `- ${reason}: ${count}`,
  );
  const impactLines = context.financialImpactByCurrency.map(
    ({ currency, amount }) => `- ${amount} ${currency}`,
  );

  const intro =
    context.mode === 'literal'
      ? [
          `The merchant searched for: "${context.query}"`,
          `Total matching exceptions: ${context.totalMatchCount}`,
          '',
          'Matches by reason:',
          ...(reasonLines.length ? reasonLines : ['- (none)']),
          '',
          'Total financial impact of the matches (quantifiable reasons only):',
          ...(impactLines.length ? impactLines : ['- none quantifiable']),
        ]
      : [
          // No literal keyword match -- the merchant's question may still be a real, vague or
          // loosely-worded question about their account ("why isn't my money showing up?",
          // "anything wrong with my payouts this week?"). Rather than reporting "0 results", give
          // the model the merchant's *entire* exception set and ask it to interpret intent --
          // it may only ever point at exceptions actually in this list, never invent one.
          `The merchant asked: "${context.query}"`,
          "This didn't literally match a transaction ID, reason, currency, or amount on record.",
          `The merchant's account currently has ${context.totalMatchCount} exception(s) in total.`,
          '',
          'All exceptions by reason:',
          ...(reasonLines.length ? reasonLines : ['- (none)']),
          '',
          'Total financial impact across all exceptions (quantifiable reasons only):',
          ...(impactLines.length ? impactLines : ['- none quantifiable']),
        ];

  const sampleIntro =
    context.mode === 'literal'
      ? `Sample of up to ${MAX_SAMPLE_FACTS} matching transactions (use only these facts; do not ` +
        'infer anything beyond them, and do not claim this sample is the complete list if ' +
        'totalMatchCount is larger):'
      : `Sample of up to ${MAX_SAMPLE_FACTS} exceptions on this account (use only these facts; do ` +
        'not infer anything beyond them):';

  const closingInstruction =
    context.mode === 'literal'
      ? 'Write one short, calm, factual summary (2-4 sentences) a merchant would read in a ' +
        'reconciliation dashboard search result: what was found, the overall financial impact if ' +
        'any, and the most common exception type. Do not speculate beyond the facts above.'
      : "Using the merchant's question and the facts above, either: (a) identify which of the " +
        "sampled exceptions (if any) are most likely relevant to what they're asking, and briefly " +
        'explain them in plain, calm language, or (b) if none seem relevant, say so plainly and ' +
        'suggest they try a specific transaction ID, currency, or amount instead. 2-4 sentences. ' +
        'Do not speculate beyond the facts above, and never claim a match that is not clearly ' +
        "supported by the merchant's wording.";

  return [
    SEARCH_EXPLANATION_SYSTEM_INTENT,
    '',
    ...intro,
    '',
    sampleIntro,
    ...context.sample.flatMap(factLinesFor),
    '',
    closingInstruction,
  ].join('\n');
}
