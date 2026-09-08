# Ask Reco chat -- demo script and QA checklist

A ready-to-use set of questions for testing and demoing the chat drawer's three response paths:
mocked knowledge-base (FAQ) answers, the AI-generated account summary, the off-topic decline, and
the "contact support" ticket escalation. Every entry below names the exact code path it exercises
so a wrong answer during a demo run points straight at the file to check.

## 1. Knowledge-base (mocked FAQ) answers

Backed by `apps/api/src/services/knowledgeBase.ts` -- fully deterministic, never calls the AI
provider, so these should give the _exact_ wording below every time. The chat badge for these
reads **"Help center answer"**.

| Ask                                                                                  | Expect                                                                                                                                                                                                         | Entry id                       |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| "For a duplicate entry, how long will the refund take?"                              | "For a duplicate entry, once support confirms it and reverses the extra charge, the refund typically posts back within 7-14 business days -- the exact timing depends on the customer's card network or bank." | `kb-duplicate-refund-timing`   |
| "My transaction is missing from the ledger -- how long will it take to fix?"         | "...typically posts within 3-5 business days."                                                                                                                                                                 | `kb-missing-ledger-timing`     |
| "There's no matching settlement for this transaction, how long until it's resolved?" | "...typically lands within 5-10 business days."                                                                                                                                                                | `kb-missing-settlement-timing` |
| "The amount doesn't match, how long until I get my refund?"                          | "...typically takes 5-7 business days to process."                                                                                                                                                             | `kb-amount-mismatch-timing`    |
| "There's a date discrepancy, how long will it take to fix?"                          | "Date discrepancies usually don't involve a refund... typically takes 1-2 business days."                                                                                                                      | `kb-date-mismatch-timing`      |
| "The currency is wrong on this transaction, how long until it's corrected?"          | "...typically takes 7-10 business days, depending on the currency conversion involved."                                                                                                                        | `kb-currency-mismatch-timing`  |
| "How can I contact your support team?"                                               | "You can reach our support team right from this chat..."                                                                                                                                                       | `kb-contact-support`           |
| "How does reconciliation work?"                                                      | "Reconciliation compares your settlement records... becomes an exception here, with a reason explaining what differs."                                                                                         | `kb-how-reconciliation-works`  |
| "Is my account data secure?"                                                         | "Your transaction and account data is scoped to your merchant account only..."                                                                                                                                 | `kb-data-security`             |

Each entry matches on keyword groups, not an exact phrase -- e.g. swapping "how long will the
refund take" for "when will I get refunded" still hits `kb-duplicate-refund-timing` as long as the
reason word ("duplicate") and a timing word ("refund"/"when"/"long"/"take"/"days"/...) are both
present. See `TIMING_WORDS` in `knowledgeBase.ts` for the full timing-word list per entry.

## 2. Real account questions (AI-generated summary)

These should literally match a real transaction/reason/currency and get a live Claude-generated
summary (badge: **"AI-generated -- verify details"**), or the deterministic fallback (badge:
**"Standard summary"**) if the API key isn't configured / the call fails.

- "T1006" / "T1013" (a real transaction ID from the seeded M-104 data)
- "AED" / "EUR" / "USD"
- "duplicate entries" (matches DUPLICATE_LEDGER by reason code, no timing word -- goes to the real
  table, not the knowledge base)
- "Show me exceptions over 1000 AED"

## 3. Off-topic decline

Backed by `deterministicSearchExplanation.ts`'s `buildOffTopicSearchExplanation` -- always the same
calm decline, badge: **"Standard summary"**, and the matches table never appears.

- "What is the capital of Japan?"
- "Tell me a joke"
- "What's the weather like today?"

## 4. Contact-support ticket escalation

`ContactSupportPrompt` (`apps/web/src/dashboard/ContactSupportPrompt.tsx`) appears below the
transcript once **3 questions** have been asked in the current chat session (any mix of the above
-- KB, real, or off-topic all count). To demo:

1. Ask any 3 questions in a row (e.g. one from each section above).
2. The "Still need help? Create a support ticket..." banner appears above the composer.
3. Click **Create support ticket** -- a success toast appears bottom-right: "Support ticket
   RPD-###### created successfully. Our team will follow up shortly." (ticket number is random,
   generated client-side; nothing is persisted -- see the component's docstring).
4. The button then shows "Ticket RPD-###### created" and is disabled for the rest of the session.

## Notes for future sessions

- Adding a new mocked FAQ topic: add an entry to `KNOWLEDGE_BASE_ENTRIES` in
  `apps/api/src/services/knowledgeBase.ts`, then add a row to section 1 above with a sample
  question that's guaranteed to hit every one of that entry's keyword groups.
- The knowledge-base check runs _before_ the literal transaction search in
  `reconciliationService.ts`'s `searchExceptionsOrAll` -- otherwise a question like "how long does
  a duplicate entry refund take" would literally keyword-match every DUPLICATE_LEDGER exception's
  reason code and get treated as a transaction search instead of the FAQ question it is.
