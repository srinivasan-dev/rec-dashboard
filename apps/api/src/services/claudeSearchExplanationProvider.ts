import { callClaude } from './claudeClient';
import {
  buildSearchExplanationPrompt,
  type SearchExplanationContext,
  type SearchExplanationProvider,
} from './searchExplanationProvider';

/**
 * Real Claude-backed provider for the search-explanation feature (see docs/ai-design.md's
 * pattern, extended here for search rather than single-exception detail). Sends exactly the
 * prompt `buildSearchExplanationPrompt` builds -- the same structural grounding as the mock
 * explanation provider, just with a real model behind it. Any failure (missing key, network
 * error, timeout, non-2xx, malformed response) throws, which `searchExplanationService` catches
 * and routes to the deterministic fallback -- this class never has to know about that fallback.
 */
export class ClaudeSearchExplanationProvider implements SearchExplanationProvider {
  readonly id = 'claude';

  async explainSearch(context: SearchExplanationContext): Promise<string> {
    return callClaude(buildSearchExplanationPrompt(context), { maxTokens: 300 });
  }
}
