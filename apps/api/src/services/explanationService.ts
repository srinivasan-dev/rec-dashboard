import type { ReconciliationException } from '@rapyd-portal/shared';

import { ClaudeExplanationProvider } from './claudeExplanationProvider';
import {
  buildDeterministicExplanation,
  type ExplanationResponse,
} from './deterministicExplanation';
import { buildExplanationContext, type ExceptionExplanationProvider } from './explanationProvider';
import { MockExplanationProvider } from './mockExplanationProvider';

const MIN_LENGTH = 10;
const MAX_LENGTH = 600;

/**
 * Non-negotiable per CLAUDE.md ("exception language is calm, not alarming") and the system
 * intent every provider is bound by ("never speculate about missing funds, fraud, liability, or
 * settlement timing"). A provider result containing any of these -- even if the call itself
 * succeeded -- is treated as unusable: exactly the "result appears unusable" case MASTER_PROMPT
 * Phase 8 requires falling back for, not just an outright provider failure.
 */
const BANNED_PATTERNS = [
  /\bfraud/i,
  /\bstolen\b/i,
  /\blost\b/i,
  /\bmissing funds\b/i,
  /\bliabilit(y|ies)\b/i,
  /\bmoney is missing\b/i,
];

function isUsable(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) return false;
  return !BANNED_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Real Claude once a key is configured (`CLAUDE_API_KEY` -- see `.env.example` and
 * `claudeClient.ts`), the existing mock provider otherwise. This is deliberately "use mock/test
 * data end-to-end until the real key is provided" rather than always attempting Claude and
 * falling back on failure: it's what keeps `generatedBy: 'mock'` a reliable, offline-testable
 * outcome (see `reconciliation.test.ts`) instead of depending on whether *this test run* happens
 * to have network access -- a missing key is an expected, permanent condition here, not a
 * transient failure to catch-and-fallback from the way a network error or bad output is.
 */
const defaultProvider: ExceptionExplanationProvider = process.env.CLAUDE_API_KEY
  ? new ClaudeExplanationProvider()
  : new MockExplanationProvider();

/**
 * The one guarantee this module exists to provide: a merchant never sees an AI failure as a
 * blocking experience (MASTER_PROMPT Phase 8). Whatever the provider does -- throws, times out,
 * returns something too short/long, or returns language that violates the calm-language
 * contract -- this function still returns a safe, deterministic explanation. `provider` is
 * injectable so a real LLM provider (or a test double) can be swapped in without touching this
 * fallback logic.
 */
export async function getExplanation(
  exception: ReconciliationException,
  provider: ExceptionExplanationProvider = defaultProvider,
): Promise<ExplanationResponse> {
  try {
    const context = buildExplanationContext(exception);
    const text = await provider.explain(context);
    if (isUsable(text)) {
      return { explanationText: text.trim(), generatedBy: provider.id };
    }
  } catch {
    // Fall through -- see docs/ai-design.md "Failure UX". The merchant gets the deterministic
    // explanation instead of an error; nothing about the failure itself is surfaced to them.
  }

  return buildDeterministicExplanation(exception);
}
