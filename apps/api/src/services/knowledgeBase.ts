/**
 * A small, fully mocked FAQ layer for the search-chat feature -- deliberately deterministic (no
 * LLM involved) so a demo always gets the same answer for the same kind of question, the same
 * non-negotiable reasoning as `deterministicSearchExplanation.ts`'s off-topic decline. Distinct
 * from `EXCEPTION_LABELS`' `turnaroundTime` on the frontend (apps/web's estimate for how long
 * *resolving the exception itself* typically takes) -- these answer merchant-facing support
 * questions like "how long until I get my refund", which is a related but separate question with
 * its own (also mocked) numbers. See docs/interview-prep/chat-demo-script.md for the full set of
 * sample questions this backs, for demo/QA use.
 */
export interface KnowledgeBaseAnswer {
  id: string;
  answer: string;
}

interface KnowledgeBaseEntry {
  id: string;
  /**
   * Each inner array is a keyword group; a query must contain at least one word from *every*
   * group to match this entry (an AND of ORs). Reason-specific entries use one group to identify
   * the exception reason and another to confirm the merchant is actually asking about timing --
   * mentioning "duplicate" alone shouldn't trigger a refund-timing answer to an unrelated
   * question.
   */
  keywordGroups: string[][];
  answer: string;
}

const TIMING_WORDS = [
  'refund',
  'refunded',
  'long',
  'when',
  'takes',
  'take',
  'timeline',
  'days',
  'time',
];

const KNOWLEDGE_BASE_ENTRIES: KnowledgeBaseEntry[] = [
  {
    id: 'kb-duplicate-refund-timing',
    keywordGroups: [['duplicate'], TIMING_WORDS],
    answer:
      'For a duplicate entry, once support confirms it and reverses the extra charge, the ' +
      'refund typically posts back within 7-14 business days -- the exact timing depends on the ' +
      "customer's card network or bank.",
  },
  {
    id: 'kb-missing-ledger-timing',
    keywordGroups: [['ledger'], TIMING_WORDS],
    answer:
      'If a transaction is missing from the ledger, once support locates and records it, any ' +
      'related correction or refund typically posts within 3-5 business days.',
  },
  {
    id: 'kb-missing-settlement-timing',
    keywordGroups: [['settlement'], TIMING_WORDS],
    answer:
      'Settlement delays are usually resolved once the processor sends the missing settlement ' +
      'file -- if a payout is due, it typically lands within 5-10 business days.',
  },
  {
    id: 'kb-amount-mismatch-timing',
    keywordGroups: [
      ['amount'],
      ['mismatch', 'match', 'wrong', 'differ', 'different'],
      TIMING_WORDS,
    ],
    answer:
      'If a refund or adjustment is due after support confirms the amount difference, it ' +
      'typically takes 5-7 business days to process.',
  },
  {
    id: 'kb-date-mismatch-timing',
    keywordGroups: [
      ['date'],
      ['mismatch', 'discrepancy', 'wrong', 'differ', 'different'],
      TIMING_WORDS,
    ],
    answer:
      "Date discrepancies usually don't involve a refund, since the amounts already match -- if " +
      'a correction to the record is needed, it typically takes 1-2 business days.',
  },
  {
    id: 'kb-currency-mismatch-timing',
    keywordGroups: [['currency'], ['mismatch', 'wrong', 'differ', 'different'], TIMING_WORDS],
    answer:
      'If a currency mismatch requires a refund or adjustment once confirmed, it typically takes ' +
      '7-10 business days, depending on the currency conversion involved.',
  },
  {
    id: 'kb-contact-support',
    keywordGroups: [
      ['contact', 'reach', 'talk', 'speak', 'email'],
      ['support', 'team', 'agent', 'someone', 'human'],
    ],
    answer:
      "You can reach our support team right from this chat -- after a few questions here, you'll " +
      'see an option to create a support ticket, and our team will follow up with you directly.',
  },
  {
    id: 'kb-how-reconciliation-works',
    keywordGroups: [
      ['how'],
      ['reconciliation', 'reconcile', 'reconciled'],
      ['work', 'works', 'working'],
    ],
    answer:
      'Reconciliation compares your settlement records from the payment processor against your ' +
      "own ledger entries. Anything that matches automatically clears; anything that doesn't " +
      'becomes an exception here, with a reason explaining what differs.',
  },
  {
    id: 'kb-data-security',
    keywordGroups: [
      ['secure', 'security', 'safe', 'encrypted', 'protect', 'protected'],
      ['data', 'information', 'account', 'transactions'],
    ],
    answer:
      'Your transaction and account data is scoped to your merchant account only. For full ' +
      'details on our security practices, please contact support.',
  },
];

/** Splits on anything that isn't a letter (drops punctuation/apostrophes/digits along with it --
 *  every keyword above is a plain lowercase word), so "doesn't" and "doesn t" tokenize the same
 *  way and neither trips up a `.includes`-style match against contractions. */
function tokenize(query: string): Set<string> {
  return new Set(
    query
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean),
  );
}

function matchesEntry(words: Set<string>, entry: KnowledgeBaseEntry): boolean {
  return entry.keywordGroups.every((group) => group.some((keyword) => words.has(keyword)));
}

/** Returns the first knowledge-base entry whose keyword groups are all satisfied by `query`, or
 *  `null` if none match. Entries are checked in declaration order, most specific (reason + timing)
 *  first, so a question mentioning both a reason and general support language still gets the more
 *  specific answer. */
export function matchKnowledgeBaseEntry(query: string): KnowledgeBaseAnswer | null {
  const words = tokenize(query);
  const entry = KNOWLEDGE_BASE_ENTRIES.find((candidate) => matchesEntry(words, candidate));
  return entry ? { id: entry.id, answer: entry.answer } : null;
}

export function isKnowledgeBaseQuery(query: string): boolean {
  return matchKnowledgeBaseEntry(query) !== null;
}
