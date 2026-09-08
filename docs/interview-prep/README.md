# Live Interview Prep

Phase 13 deliverable per `docs/prompts/MASTER_PROMPT.md`: "stop coding" and prepare for the
60-minute live review as the candidate, not the builder. Everything in this folder is grounded
strictly in what this repository actually contains as of Phase 12 — no aspirational claims about
unbuilt features.

## Contents

- **[questions.md](questions.md)** — the 25 most likely questions, each with: what the
  interviewer is testing, a strong 1-2 minute spoken answer, and likely follow-ups. Grounded in
  MASTER_PROMPT's own 20-question focus list plus 5 more specific to choices this repo actually
  makes (Jest vs. Vitest, the money-parsing approach, the API boundary, the focus-trap bug found
  in Phase 9).
- **[do-not-claim.md](do-not-claim.md)** — a short, honest list of things in this codebase that
  should not be overstated or defended as more than they are, per MASTER_PROMPT's explicit
  instruction to "flag anything in the code that I should not claim or cannot defend."

## How to use this under interview pressure

- Every answer is written to be **said out loud in 1-2 minutes**, not read verbatim — they're
  scripted for content and structure, not for word-for-word delivery.
- Where an answer says "see `docs/x.md`," that doc has the fuller version if a follow-up goes
  deeper than the prepared answer.
- If a question exposes something on the `do-not-claim.md` list, the honest move is to say so
  directly ("that's a known gap, here's why it's not in scope, here's what I'd do next") rather
  than improvise a defense — every reviewed answer in `questions.md` already does this where
  relevant, so leaning on the prepared wording is safe.
