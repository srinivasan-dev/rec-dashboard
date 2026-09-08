import type { ReconciliationException } from '@rapyd-portal/shared';

import { ClaudeSearchExplanationProvider } from './claudeSearchExplanationProvider';
import {
  buildDeterministicSearchExplanation,
  type SearchExplanationResponse,
} from './deterministicSearchExplanation';
import {
  buildSearchExplanationContext,
  type SearchExplanationProvider,
} from './searchExplanationProvider';

const MIN_LENGTH = 10;
const MAX_LENGTH = 800;

/**
 * Same non-negotiable and same blunt, deterministic check as `explanationService.ts`'s
 * `isUsable` -- a provider result containing calm-language-violating terms is unusable regardless
 * of whether the call itself succeeded.
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

const defaultProvider: SearchExplanationProvider = new ClaudeSearchExplanationProvider();

/**
 * The same guarantee `getExplanation` provides for single exceptions, extended to a search
 * result set: a merchant never sees an AI failure as a blocking experience. Whatever the provider
 * does -- throws (no API key configured, network error, timeout, non-2xx) or returns something
 * too short/long/unsafe -- this still returns a safe, deterministic summary. `provider` is
 * injectable so a test double can be swapped in without hitting the real API.
 *
 * `mode`/`literalMatchCount` support the natural-language "intent" fallback: when the caller
 * (`reconciliationController.ts`) already knows `searchExceptions` found nothing literal, it
 * passes the merchant's *entire* exception set as `exceptionsForContext` with `mode: 'intent'` --
 * the response's `matchCount` still reports the true literal count (0), not that pool's size.
 */
export async function getSearchExplanation(
  query: string,
  exceptionsForContext: ReconciliationException[],
  options: {
    mode?: 'literal' | 'intent';
    literalMatchCount?: number;
    provider?: SearchExplanationProvider;
  } = {},
): Promise<SearchExplanationResponse> {
  const mode = options.mode ?? 'literal';
  const literalMatchCount = options.literalMatchCount ?? exceptionsForContext.length;
  const provider = options.provider ?? defaultProvider;
  const context = buildSearchExplanationContext(query, exceptionsForContext, mode);

  try {
    const text = await provider.explainSearch(context);
    if (isUsable(text)) {
      return {
        explanationText: text.trim(),
        generatedBy: provider.id,
        matchCount: literalMatchCount,
      };
    }
  } catch {
    // Fall through -- see docs/ai-design.md "Failure UX", same pattern applied to search.
  }

  return buildDeterministicSearchExplanation(context, literalMatchCount);
}
