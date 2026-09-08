import type { ReconciliationException } from '@rapyd-portal/shared';

export interface ExplanationResponse {
  explanationText: string;
  generatedBy: string;
}

const DETERMINISTIC_TEXT_BY_REASON: Record<ReconciliationException['reason'], string> = {
  MISSING_LEDGER:
    'A settlement was received from the processor, but no matching ledger entry was found. This needs review.',
  MISSING_SETTLEMENT:
    'A ledger entry exists, but no matching settlement was received from the processor. This needs review.',
  DUPLICATE_LEDGER:
    'More than one ledger entry was found for this transaction. This needs review to confirm whether it was recorded twice.',
  AMOUNT_MISMATCH:
    'The settlement and ledger amounts for this transaction do not match. This needs review.',
  DATE_MISMATCH:
    'The settlement and ledger dates for this transaction do not match. This may be a processing delay, or it may need review.',
  CURRENCY_MISMATCH:
    'The settlement and ledger currencies for this transaction do not match. This needs review.',
};

/**
 * The guaranteed-safe explanation, generated directly from the reconciliation rule (the
 * `reason` a deterministic engine already decided) rather than from a provider call --
 * MASTER_PROMPT Phase 8's required fallback for when the AI request fails or its output looks
 * unusable (see `explanationService.ts`). Always calm, factual, and reviewed; never "money is
 * missing" or "lost" (CLAUDE.md non-negotiables). `generatedBy: 'fallback'` tells the frontend
 * this wasn't a provider-generated explanation, so it doesn't carry an "AI-generated" badge.
 */
export function buildDeterministicExplanation(
  exception: ReconciliationException,
): ExplanationResponse {
  return {
    explanationText: DETERMINISTIC_TEXT_BY_REASON[exception.reason],
    generatedBy: 'fallback',
  };
}
