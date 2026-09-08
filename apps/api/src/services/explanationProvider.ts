import { formatMinorUnitsAsDecimal, type ReconciliationException } from '@rapyd-portal/shared';

/**
 * The strict structured facts an explanation may draw on -- built entirely from the already-
 * decided `ReconciliationException` (deterministic code owns whether an exception exists, its
 * reason, and its amounts; see CLAUDE.md's non-negotiables). No provider, mock or real, ever
 * receives anything beyond this shape, so there's no path for it to introduce a fact that isn't
 * already decided and trusted.
 */
export interface ExplanationContext {
  transactionId: string;
  reason: ReconciliationException['reason'];
  currency: string;
  settlement: { amount: string; date: string } | null;
  ledger: { amount: string; date: string } | null;
  differenceAmount: string | null;
  duplicateLedgerCount: number | null;
}

/**
 * Implemented today by `MockExplanationProvider`. A real LLM-backed provider would implement
 * this same interface -- same input shape, same return shape -- so `explanationService.ts`
 * never has to change when the mock is swapped for a real call; only which provider instance it
 * holds changes.
 */
export interface ExceptionExplanationProvider {
  /** Identifies the provider in the response's `generatedBy` field (e.g. 'mock', 'openai'). */
  readonly id: string;
  explain(context: ExplanationContext): Promise<string>;
}

/**
 * The fixed system intent every provider is bound by. A real LLM provider would send this
 * verbatim as its system prompt; `MockExplanationProvider` doesn't call an LLM at all, but is
 * still written to honor the same constraint (only use supplied facts, never speculate about
 * funds/fraud/liability/timing) so swapping it for a real provider doesn't change the merchant-
 * visible guarantee.
 */
export const EXPLANATION_SYSTEM_INTENT =
  'You explain payment reconciliation exceptions to merchants in clear factual language. ' +
  'Only use supplied information. Never speculate about missing funds, fraud, liability, or ' +
  'settlement timing when it is not supported by the provided data.';

/** Turns an already-decided exception into the structured facts a provider is allowed to see. */
export function buildExplanationContext(exception: ReconciliationException): ExplanationContext {
  return {
    transactionId: exception.transactionId,
    reason: exception.reason,
    currency: exception.currency,
    settlement: exception.settlement
      ? {
          amount: formatMinorUnitsAsDecimal(exception.settlement.netAmountMinorUnits),
          date: exception.settlement.transactionDate,
        }
      : null,
    ledger: exception.ledger
      ? {
          amount: formatMinorUnitsAsDecimal(exception.ledger.amountMinorUnits),
          date: exception.ledger.transactionDate,
        }
      : null,
    differenceAmount:
      exception.differenceMinorUnits !== null
        ? formatMinorUnitsAsDecimal(exception.differenceMinorUnits)
        : null,
    duplicateLedgerCount: exception.duplicateLedgerEntries?.length ?? null,
  };
}

/**
 * The exact prompt a real LLM provider would send -- system intent + an itemized, strictly
 * factual context, nothing else. Exists (and is unit-tested) independent of any provider so the
 * contract is fixed before a real LLM is ever wired in. `MockExplanationProvider` doesn't call
 * this -- it doesn't need a prompt to synthesize its template text -- but a real provider would.
 */
export function buildExplanationPrompt(context: ExplanationContext): string {
  const facts = [
    `transactionId: ${context.transactionId}`,
    `reason: ${context.reason}`,
    `currency: ${context.currency}`,
    context.settlement
      ? `settlement: ${context.settlement.amount} ${context.currency} on ${context.settlement.date}`
      : 'settlement: none on record',
    context.ledger
      ? `ledger: ${context.ledger.amount} ${context.currency} on ${context.ledger.date}`
      : 'ledger: none on record',
    context.differenceAmount !== null
      ? `difference: ${context.differenceAmount} ${context.currency}`
      : null,
    context.duplicateLedgerCount !== null
      ? `duplicateLedgerEntries: ${context.duplicateLedgerCount}`
      : null,
  ].filter((line): line is string => line !== null);

  return [
    EXPLANATION_SYSTEM_INTENT,
    '',
    'Facts (use only these; do not infer anything beyond them):',
    ...facts.map((fact) => `- ${fact}`),
    '',
    'Write one short, calm, factual explanation (2-3 sentences) a merchant would read in a ' +
      'reconciliation dashboard. Do not speculate beyond the facts above.',
  ].join('\n');
}
