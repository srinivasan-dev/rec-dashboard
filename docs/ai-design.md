# AI Design — Exception Explanation Feature

Phase 8 deliverable per `docs/prompts/MASTER_PROMPT.md`. Covers the design of the merchant-facing
"explain this exception" feature: prompt design, grounding, hallucination controls, failure UX,
logging/observability, PII/data handling, and a ship/no-ship recommendation. Implementation lives
in `apps/api/src/services/` (`explanationProvider.ts`, `mockExplanationProvider.ts`,
`deterministicExplanation.ts`, `explanationService.ts`) and is surfaced in the dashboard's
"AI Explain" drawer tab (`apps/web/src/dashboard/ExceptionDrawer.tsx`).

## The non-negotiable this whole design serves

> The LLM is not the reconciliation engine.

Deterministic code (`packages/shared`'s `reconcile.ts`) already decided, before an explanation is
ever requested: whether an exception exists, its reason, the settlement amount, the ledger
amount, the difference, and the dates. The explanation feature's only job is turning those
already-decided facts into merchant-friendly prose. Nothing described below — mock or a future
real provider — has any path to change what the merchant is told actually happened; it can only
change how it's phrased.

## 1. Prompt design

`explanationProvider.ts` builds a prompt from a strict `ExplanationContext` — never from the raw
`ReconciliationException` or anything else that could carry more than the seven fields:
`transactionId`, `reason`, `currency`, `settlement` (amount + date, or null),
`ledger` (amount + date, or null), `differenceAmount`, `duplicateLedgerCount`. The prompt itself
(`buildExplanationPrompt`) is:

1. A fixed system intent, sent verbatim on every call:

   > "You explain payment reconciliation exceptions to merchants in clear factual language. Only
   > use supplied information. Never speculate about missing funds, fraud, liability, or
   > settlement timing when it is not supported by the provided data."

2. An itemized, labeled fact list built only from the context above — no free text, no merchant
   PII, no internal system details.
3. A short, explicit instruction: 2-3 sentences, calm and factual, don't infer beyond the facts.

This prompt is unit-tested (`explanationProvider.test.ts`) independent of any provider, so the
contract is fixed and reviewable before a real LLM is ever wired in. `MockExplanationProvider`
doesn't actually send this prompt anywhere — it synthesizes text from the same context via
per-reason templates — but it's bound by the identical constraint (facts in, calm factual prose
out, nothing else), which is what makes it a fair stand-in for what a real provider must also do.

## 2. Grounding

Every explanation is grounded in exactly the fields the deterministic engine already computed:

- Amounts are the same decimal strings the dashboard itself displays (`formatMinorUnitsAsDecimal`
  — money is converted from integer minor units via string arithmetic, never float parsing, the
  same rule that applies everywhere else in this codebase).
- Dates, currency, and the duplicate-entry count come directly off the `ReconciliationException`.
- There is no mechanism for the context builder to include anything not already present on the
  exception object — no external lookups, no merchant free-text fields, no history beyond this
  one transaction.

This means grounding is structural, not a prompt-engineering hope: a provider literally cannot
mention an amount, date, or transaction that isn't in `ExplanationContext`, because nothing else
is ever put in front of it.

## 3. Hallucination controls

Two independent layers, because "the call succeeded" and "the output is safe to show a merchant"
are different questions:

1. **Structural grounding** (above) — bounds what the provider _can_ talk about.
2. **Output validation** (`explanationService.ts`'s `isUsable`) — bounds what's actually shown,
   regardless of what the provider returned:
   - Length bounds (10-600 characters) reject empty, truncated, or runaway output.
   - A banned-language check rejects any result containing `fraud`, `stolen`, `lost`,
     `missing funds`, `liability`/`liabilities`, or `money is missing` — the exact language
     CLAUDE.md's calm-language non-negotiable forbids. This is deliberately blunt (a regex list,
     not a second LLM call to judge the first one) — simple, deterministic, and testable, which
     matters more here than being clever.

Either check failing routes to the deterministic fallback (§4) rather than being shown, retried,
or silently truncated. `explanationService.test.ts` exercises both: a provider that returns
alarmist language, and one that returns implausibly short/long output, both fall back correctly.

## 4. Failure UX

If the provider throws (network error, timeout, rate limit — anything) or its output fails the
usability check, `getExplanation` catches it and returns `buildDeterministicExplanation(exception)`
instead — the same reason-keyed, calm, pre-reviewed text that was the Phase 4 stub. The merchant
never sees an error state for this: the response is still `200 OK` with a real (if less specific)
explanation, tagged `generatedBy: 'fallback'` instead of the provider's id.

The frontend reads that tag to avoid a subtler failure mode: claiming AI involvement that didn't
happen. `ExceptionDrawer.tsx`'s "AI Explain" tab shows an "Auto-generated — verify details" badge
only when `generatedBy` is a real provider id; a `'fallback'` response gets a plain
"Standard explanation" badge instead. The disclaimer footer ("verify against your own records
before taking action") is shown either way — grounded-and-bounded is not the same as guaranteed
correct, and the merchant should treat either version as a starting point, not a final word.

The only case this doesn't cover is the fetch to the explanation endpoint itself failing (network
error reaching `apps/api`, not the provider inside it failing) — that's a distinct, already-
handled path: the tab shows "We couldn't generate an explanation right now. The details above are
accurate," pointing back at the Details tab's deterministic content, which loaded independently
and isn't affected by the explanation call at all.

## 5. Logging / observability

Not implemented in this take-home (no logging infrastructure exists in `apps/api` yet — see
`docs/architecture.md`), but the design point worth stating: `explanationService.ts`'s
try/catch and `isUsable` check are exactly the two places a real deployment would emit structured
log events (provider id, latency, success/failure/fallback-reason, but never the explanation text
or the transaction's PII) — a fallback happening for validation reasons is worth alerting on
separately from a fallback happening because the provider was unreachable, since the former means
the model's outputs are drifting into unsafe territory and the latter means an infrastructure
problem. Both currently fall through to the same code path (`catch` and the `isUsable` check both
just return the deterministic explanation) — splitting them into distinct, observable outcomes is
the natural next step if this went to production, not something scoped for this build.

## 6. PII / data-handling considerations

- `ExplanationContext` carries a transaction ID, a reason code, a currency, and two amount/date
  pairs — no merchant name, no account/routing numbers, no customer PII of any kind ever reaches
  it, because none of that exists on `ReconciliationException` in the first place (see
  `packages/shared/src/types.ts`).
- Merchant isolation (CLAUDE.md's non-negotiable) applies before an exception ever reaches this
  feature: `getExceptionById` is scoped by the authenticated `merchantId`, so a provider is never
  handed a different merchant's data to begin with.
- If a real LLM provider were introduced, the transaction ID is the only quasi-identifying field
  in the context. Whether that's acceptable to send to a third-party API is a data-processing-
  agreement question for whichever vendor is chosen — out of scope for this mock, but worth
  flagging explicitly rather than silently assuming it's fine.

## 7. Should this ship?

**Recommendation: yes, with the boundary this build already enforces — not further.**

AI-generated explanations may be merchant-visible when they're this strongly grounded and bounded:
the provider only ever sees seven already-decided fields, its output is validated before display,
and a failure or an unsafe result both fall back to reviewed, deterministic text rather than
blocking or erroring. That combination is what makes "AI-generated" safe to show at all here.

What should **not** ship on this same pattern: anything where the AI's output could plausibly
change what a merchant _does_ next in a way that matters — a recommendation to dispute a charge,
an escalation to a specific team, a suggested dollar amount to write off. Those are higher-risk,
more ambiguous calls than "phrase this calmly," and should stay routed to human/support review
rather than AI-generated, even with the same grounding and validation applied. This feature's
scope — explain a fact that's already decided — is deliberately narrower than that, and the
recommendation is to keep it that way rather than extend the same mock-to-real-provider pattern
to a decision-making feature without a fresh design pass.

## AI tooling used to build this take-home

This entire repository — architecture, reconciliation engine, API, dashboard, tests, and this
document — was built with **Claude Code** (Anthropic's agentic CLI), working phase-by-phase from
`docs/prompts/MASTER_PROMPT.md` under human direction and review at each phase. `CLAUDE.md`
documents the non-negotiables it worked under; `docs/sessions/` is a per-session log of the
decisions, trade-offs, and open questions from that process, kept specifically so the reasoning
behind this build is inspectable rather than opaque. This section exists because MASTER_PROMPT
Phase 8 explicitly asks that AI tooling used in developing the take-home be clearly marked here,
not left implicit.
