import { callClaude } from './claudeClient';
import {
  buildExplanationPrompt,
  type ExceptionExplanationProvider,
  type ExplanationContext,
} from './explanationProvider';

/**
 * Real Claude-backed provider for the per-exception "AI Explain" tab (`ExceptionDetailPanel.tsx`)
 * -- replaces `MockExplanationProvider` as the provider `explanationService.ts` reaches for once
 * a real API key is configured (see that file's `defaultProvider` selection). Sends exactly the
 * prompt `buildExplanationPrompt` already builds and is unit-tested against
 * (`explanationProvider.test.ts`) -- this class adds nothing to what the model is allowed to see,
 * it only sends that fixed prompt to a real model instead of synthesizing template text locally.
 * Any failure throws, which `getExplanation` catches and routes to the deterministic fallback.
 */
export class ClaudeExplanationProvider implements ExceptionExplanationProvider {
  readonly id = 'claude';

  async explain(context: ExplanationContext): Promise<string> {
    return callClaude(buildExplanationPrompt(context), { maxTokens: 200 });
  }
}
