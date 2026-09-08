import type { SearchExplanationContext } from './searchExplanationProvider';

export interface SearchExplanationResponse {
  explanationText: string;
  generatedBy: string;
  matchCount: number;
}

const REASON_LABELS: Record<string, string> = {
  MISSING_LEDGER: 'not recorded in the ledger',
  MISSING_SETTLEMENT: 'missing a matching settlement',
  DUPLICATE_LEDGER: 'duplicate ledger entries',
  AMOUNT_MISMATCH: "amounts that don't match",
  DATE_MISMATCH: 'date discrepancies',
  CURRENCY_MISMATCH: "currencies that don't match",
};

/**
 * The guaranteed-safe summary, built directly from the deterministic aggregate facts already
 * computed in `buildSearchExplanationContext` -- same fallback guarantee as
 * `deterministicExplanation.ts`: a merchant never sees an AI failure as a blocking experience,
 * and `generatedBy: 'fallback'` tells the frontend this wasn't provider-generated.
 *
 * `literalMatchCount` is always the true `searchExceptions` count (0 in 'intent' mode) -- kept
 * separate from `context.totalMatchCount`, which in 'intent' mode describes the *whole* exception
 * pool the model was asked to interpret, not a match count the frontend should report as such.
 */
export function buildDeterministicSearchExplanation(
  context: SearchExplanationContext,
  literalMatchCount: number,
): SearchExplanationResponse {
  if (context.mode === 'intent') {
    const explanationText =
      context.totalMatchCount === 0
        ? `No exceptions found on this account for "${context.query}".`
        : `We couldn't find an exact match for "${context.query}". You currently have ` +
          `${context.totalMatchCount} exception${context.totalMatchCount === 1 ? '' : 's'} on ` +
          'record -- try searching by transaction ID, currency, or amount for a specific one.';
    return { explanationText, generatedBy: 'fallback', matchCount: literalMatchCount };
  }

  if (context.totalMatchCount === 0) {
    return {
      explanationText: `No exceptions matched "${context.query}".`,
      generatedBy: 'fallback',
      matchCount: 0,
    };
  }

  const [topReason] = Object.entries(context.reasonCounts).sort(
    ([, a], [, b]) => (b ?? 0) - (a ?? 0),
  );
  const reasonPhrase = topReason ? (REASON_LABELS[topReason[0]] ?? topReason[0]) : null;

  const impactPhrase = context.financialImpactByCurrency.length
    ? ` Total financial impact: ${context.financialImpactByCurrency
        .map(({ currency, amount }) => `${amount} ${currency}`)
        .join(', ')}.`
    : '';

  const plural = context.totalMatchCount === 1 ? 'exception' : 'exceptions';
  const reasonClause = reasonPhrase ? ` Most commonly, these are ${reasonPhrase}.` : '';

  return {
    explanationText:
      `Found ${context.totalMatchCount} ${plural} matching "${context.query}".` +
      `${reasonClause}${impactPhrase}`,
    generatedBy: 'fallback',
    matchCount: literalMatchCount,
  };
}
