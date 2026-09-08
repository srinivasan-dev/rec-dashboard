const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const REQUEST_TIMEOUT_MS = 15_000;

/** Claude Haiku 4.5 -- fast/cheap enough for a per-request summary call, which is all either AI
 *  feature in this app needs (see docs/ai-design.md). Overridable via `CLAUDE_MODEL`. */
export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

interface AnthropicMessageResponse {
  content: { type: string; text?: string }[];
}

export interface CallClaudeOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

/**
 * One shared low-level call to the Claude Messages API -- both `claudeExplanationProvider.ts`
 * (single exception) and `claudeSearchExplanationProvider.ts` (search results) send a single
 * user-turn prompt and want back the concatenated text content, nothing more, so the HTTP
 * plumbing (auth header, timeout, response parsing) lives here once rather than twice.
 *
 * `CLAUDE_API_KEY` is optional by design -- see the take-home's `.env.example`: with no key
 * configured, this always throws, which both callers already treat as "use the fallback" rather
 * than a hard error (docs/ai-design.md's Failure UX). Provide a real key to see live Claude
 * output instead of the deterministic/mock stand-ins.
 */
export async function callClaude(prompt: string, options: CallClaudeOptions = {}): Promise<string> {
  const apiKey = options.apiKey ?? process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY is not configured.');
  }
  const model = options.model ?? process.env.CLAUDE_MODEL ?? DEFAULT_CLAUDE_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 300,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Claude API responded with ${response.status}`);
    }

    const body = (await response.json()) as AnthropicMessageResponse;
    const text = body.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join(' ')
      .trim();

    if (!text) {
      throw new Error('Claude API returned no text content.');
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}
