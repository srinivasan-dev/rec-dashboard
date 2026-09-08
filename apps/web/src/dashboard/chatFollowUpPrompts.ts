import type { ExceptionReason, SummaryDto } from '../api/types';

/** One candidate follow-up per exception reason actually present on the account -- mirrors the
 *  language GlobalSearchBar/SuggestedPrompts already use, so a merchant sees the same phrasing
 *  wherever prompts show up. Reasons with no natural "ask about this" phrasing (none currently)
 *  are simply absent here rather than forced into a generic prompt. */
const REASON_PROMPTS: Partial<Record<ExceptionReason, string>> = {
  MISSING_LEDGER: 'Why is my money not showing up?',
  MISSING_SETTLEMENT: 'Which settlements are missing?',
  DUPLICATE_LEDGER: 'Show me duplicate entries',
  AMOUNT_MISMATCH: "Which amounts don't match?",
  DATE_MISMATCH: 'Any date discrepancies?',
  CURRENCY_MISMATCH: 'Any currency mismatches?',
};

/** Used only to fill out the minimum count when there aren't enough reason-driven candidates
 *  left (e.g. the merchant already asked about every reason present on their account). */
const FALLBACK_PROMPTS = [
  'Which transactions need review?',
  'What is my total financial impact?',
  'Summarize my exceptions',
];

const MIN_PROMPTS = 2;
const MAX_PROMPTS = 3;

interface Candidate {
  text: string;
  /** The real exception count driving this suggestion -- ranks the most relevant prompts (the
   *  reasons actually costing the merchant the most transactions) first, never arbitrary. */
  weight: number;
}

/**
 * Follow-up prompts for the chat drawer's composer, regenerated from the merchant's real
 * exceptionsByReason counts (same data ExceptionBreakdown/ExceptionsByReasonChart already show --
 * nothing fabricated) and re-ranked as those counts or the conversation change. Already-asked
 * questions (case-insensitive match against `history`) are filtered out so the same suggestion
 * doesn't linger after a merchant acts on it. Always returns between `MIN_PROMPTS` and
 * `MAX_PROMPTS` entries when enough distinct candidates exist.
 */
export function getChatFollowUpPrompts(
  summary: SummaryDto | undefined,
  history: string[],
): string[] {
  const asked = new Set(history.map((query) => query.trim().toLowerCase()));
  const candidates: Candidate[] = [];

  if (summary) {
    const entries = Object.entries(summary.exceptionsByReason) as [ExceptionReason, number][];
    for (const [reason, count] of entries) {
      const text = REASON_PROMPTS[reason];
      if (text && count > 0) candidates.push({ text, weight: count });
    }
    if (summary.financialImpactByCurrency.length > 0) {
      candidates.push({
        text: 'What is my total financial impact?',
        weight: summary.exceptionCount,
      });
    }
  }

  candidates.sort((a, b) => b.weight - a.weight);

  const picked: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const key = candidate.text.toLowerCase();
    if (asked.has(key) || seen.has(key)) continue;
    seen.add(key);
    picked.push(candidate.text);
    if (picked.length >= MAX_PROMPTS) break;
  }

  if (picked.length < MIN_PROMPTS) {
    for (const fallback of FALLBACK_PROMPTS) {
      const key = fallback.toLowerCase();
      if (asked.has(key) || seen.has(key)) continue;
      seen.add(key);
      picked.push(fallback);
      if (picked.length >= MIN_PROMPTS) break;
    }
  }

  return picked.slice(0, MAX_PROMPTS);
}
