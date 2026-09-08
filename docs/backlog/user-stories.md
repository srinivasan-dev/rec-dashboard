# User Stories

Grouped by epic (see [`epics.md`](epics.md)). Acceptance criteria reference
`docs/product-spec.md`, `docs/architecture.md`, or the assessment brief where the requirement
was already decided there, rather than inventing new criteria here.

## EPIC-01 — Product Thinking & UX Framing ✅

| ID      | Story                                                                                                                                         | Acceptance Criteria                                                                                                 | Status  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| US-01.1 | As a merchant finance user, I want to understand at a glance whether my settlements reconciled, so I don't have to email support to find out. | `docs/product-spec.md` Journey 1 defined with trigger, question, key info, outcome.                                 | ✅ Done |
| US-01.2 | As a merchant, I want plain-language explanations of exceptions instead of internal codes, so I can act without domain expertise.             | All 5 exception codes have a merchant-facing title, one-sentence explanation, and next step (`product-spec.md` §9). | ✅ Done |
| US-01.3 | As a domain owner, I want a measurable success metric defined before building, so we can prove the portal reduced support load.               | `product-spec.md` §13 defines the metric and how to measure it post-launch.                                         | ✅ Done |

## EPIC-02 — Platform Foundation ✅

| ID      | Story                                                                                                                                                                   | Acceptance Criteria                                                              | Status  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| US-02.1 | As an engineer picking this up, I want a monorepo that installs/typechecks/tests/builds cleanly from a fresh clone, so Phase 3 can start without fixing plumbing first. | `npm install && npm run typecheck && npm run test && npm run build` all succeed. | ✅ Done |
| US-02.2 | As an engineer, I want the reconciliation engine boundary enforced structurally, so business logic can't accidentally depend on Express or React.                       | `packages/shared` has zero runtime dependency on `apps/*`.                       | ✅ Done |
| US-02.3 | As an engineer, I want merchant-context middleware in place before any real endpoint exists, so isolation is the default, not a retrofit.                               | `attachMerchantContext` sets `req.merchantId` server-side on every request.      | ✅ Done |

## EPIC-EX — Engineering Standards & Developer Experience ✅

| ID      | Story                                                                                                                                                                  | Acceptance Criteria                                                                                                                | Status  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-EX.1 | As an engineer, I want ephemeral UI state and server state kept in clearly separate places, so state bugs don't come from two sources of truth disagreeing.            | `docs/standards/frontend-standards.md` state-boundary table exists; `uiSlice` scoped to drawer + toasts only, no API data.         | ✅ Done |
| US-EX.2 | As an engineer, I want the frontend test runner to match the assessment brief exactly, so there's no ambiguity to defend in review.                                    | `apps/web` runs Jest + RTL (not Vitest); tests pass.                                                                               | ✅ Done |
| US-EX.3 | As an engineer, I want an e2e harness ready before there's a UI to test, so real journey coverage in Phase 5+ is a matter of writing specs, not configuring tooling.   | Playwright configured in `apps/web`, one smoke spec passing.                                                                       | ✅ Done |
| US-EX.4 | As an engineer, I want obviously-wrong commits caught before they land, so review time isn't spent on avoidable mistakes.                                              | Pre-commit hook runs lint-staged (eslint --fix + prettier) and `typecheck` on every commit.                                        | ✅ Done |
| US-EX.5 | As anyone (including a fresh Claude Code session) joining this project, I want written, stack-specific standards, so "follow best practices" doesn't depend on memory. | `CLAUDE.md` + `docs/standards/backend-standards.md` + `docs/standards/frontend-standards.md` exist and cross-reference each other. | ✅ Done |

## EPIC-03 — Reconciliation Engine ✅

| ID      | Story                                                                                                                                                              | Acceptance Criteria                                                                                                                                                                                      | Status  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-03.1 | As a merchant, I want every mismatch between my settlement file and ledger correctly classified, so I know exactly what kind of problem I'm looking at.            | All 5 rules implemented (missing ledger, missing settlement, duplicate ledger, amount mismatch, date mismatch) + currency mismatch evaluated defensively; unit tests cover each against real M-104 rows. | ✅ Done |
| US-03.2 | As a merchant with transactions in multiple currencies, I want financial impact reported per currency, not summed together, so the number I see is meaningful.     | Summary never aggregates across currency; unit test asserts this explicitly.                                                                                                                             | ✅ Done |
| US-03.3 | As Rapyd, I want reconciliation keyed by merchant + transaction (not transaction alone), so merchants can't see each other's data even if transaction IDs collide. | Unit test with colliding transaction IDs across two merchants resolves correctly per merchant.                                                                                                           | ✅ Done |
| US-03.4 | As an engineer, I want money handled in integer minor units throughout, so floating-point drift never produces an incorrect reconciliation result.                 | Unit test with values known to trigger float error resolves correctly (see `docs/architecture.md` §8).                                                                                                   | ✅ Done |

## EPIC-04 — Reconciliation API ✅

| ID      | Story                                                                                                                                                       | Acceptance Criteria                                                                                     | Status  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| US-04.1 | As the frontend, I want a merchant-scoped summary endpoint, so the dashboard's headline numbers come from one authoritative call.                           | `GET /api/reconciliation/summary`; Supertest coverage.                                                  | ✅ Done |
| US-04.2 | As the frontend, I want a paginated, filterable, sortable exceptions endpoint, so the table doesn't fetch-and-slice everything client-side.                 | `page/pageSize/reason/from/to/sortBy/sortOrder` validated via Zod; response shape `{data, pagination}`. | ✅ Done |
| US-04.3 | As a merchant, I want to export my exceptions scoped to my current filters, so I can share exactly what I'm looking at.                                     | Export endpoint returns only the authenticated merchant's filtered data.                                | ✅ Done |
| US-04.4 | As Rapyd, I want a request for another merchant's exception by ID to fail with 404, so cross-merchant leakage is structurally prevented, not just untested. | Integration test attempts cross-merchant access, asserts 404.                                           | ✅ Done |

## EPIC-05 — Merchant Dashboard ✅ (one story deferred)

| ID      | Story                                                                                                                                         | Acceptance Criteria                                                                     | Status      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| US-05.1 | As a merchant, I want to know within 5 seconds whether my settlements are healthy, so I don't have to read a whole table for a yes/no answer. | Status line renders above the fold, matches `product-spec.md` wireframe priority order. | ✅ Done     |
| US-05.2 | As a merchant, I want my filters/sort/page reflected in the URL, so refreshing or sharing a link preserves what I was looking at.             | `product-spec.md` §17 criterion 4.                                                      | ✅ Done     |
| US-05.3 | As a merchant on a phone, I want the exceptions table usable without horizontal scrolling, so I can check status away from my desk.           | Responsive strategy (`product-spec.md` §11) implemented — stacked cards on mobile.      | 🧊 Deferred |

## EPIC-06 — Exception Investigation ✅

| ID      | Story                                                                                                                                                         | Acceptance Criteria                                    | Status  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------- |
| US-06.1 | As a merchant, I want to open an exception and see settlement vs. ledger side by side with the difference called out, so I understand the discrepancy myself. | Drawer shows both records + computed difference.       | ✅ Done |
| US-06.2 | As a keyboard-only merchant, I want to open, read, and close the exception drawer without a mouse, so accessibility isn't a second-class experience.          | Focus trap, `Escape` closes, focus returns to trigger. | ✅ Done |
| US-06.3 | As a merchant, I want a recommended next step for every exception type, so I'm not left with data and no idea what to do with it.                             | Matches `product-spec.md` §9 next-step column exactly. | ✅ Done |

## EPIC-07 — Frontend Test Coverage ✅

| ID      | Story                                                                                                                                                                 | Acceptance Criteria                                                                                                    | Status  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------- |
| US-07.1 | As a reviewer, I want the exceptions table's core interactions covered by tests that query the way a user would, so tests document real behavior, not implementation. | RTL tests: filter, sort, paginate, loading, empty/all-clear, error + retry, opening detail — role/label-based queries. | ✅ Done |

## EPIC-08 — AI-Assisted Explanations ✅

| ID      | Story                                                                                                                                            | Acceptance Criteria                                                                                       | Status  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------- |
| US-08.1 | As a merchant, I want a plain-English explanation of why a transaction was flagged, so I don't have to interpret raw reconciliation data myself. | Explanation strictly grounded in the exception's already-decided facts (see `CLAUDE.md` non-negotiables). | ✅ Done |
| US-08.2 | As a merchant, I want a sensible explanation even if the AI call fails, so a backend hiccup never blocks me from understanding my exception.     | Deterministic fallback text; failure never surfaced as a dead end.                                        | ✅ Done |
| US-08.3 | As Rapyd, I want AI explanations clearly labeled as AI-generated, so merchants apply appropriate scrutiny.                                       | UI label present; `docs/ai-design.md` states the human-review recommendation.                             | ✅ Done |

## EPIC-09 — Accessibility Compliance ✅

| ID      | Story                                                                                                                                                 | Acceptance Criteria                                                    | Status  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------- |
| US-09.1 | As a screen reader user, I want status changes and errors announced, so I'm not left guessing whether something happened.                             | `aria-live` regions present and verified (not just present in markup). | ✅ Done |
| US-09.2 | As an auditor, I want a documented accessibility review with the most important decisions explained, so this isn't "we used semantic HTML and hoped." | `docs/accessibility.md` exists with concrete findings and fixes.       | ✅ Done |

## EPIC-10 — Stakeholder Communication ✅

| ID      | Story                                                                                                                                                                              | Acceptance Criteria                                         | Status  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- |
| US-10.1 | As the Head of Merchant Support, I want a one-page, non-technical memo on what merchants can now self-serve vs. what still needs a ticket, so I can set expectations with my team. | `docs/stakeholder-memo.md`, ~1 page, no engineering jargon. | ✅ Done |

## EPIC-11 — Submission Documentation ✅

| ID      | Story                                                                                                                                                       | Acceptance Criteria                                                                                                                                                                      | Status  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-11.1 | As a reviewer, I want to understand the whole project from the README in about 5 minutes, so I don't have to read the codebase cold before the live review. | README covers problem, architecture, tech stack, run/test instructions, API endpoints, reconciliation rules, assumptions, accessibility, AI design, trade-offs, production improvements. | ✅ Done |

## EPIC-12 — Engineering Quality Review ✅

| ID      | Story                                                                                                                            | Acceptance Criteria                                                                        | Status  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------- |
| US-12.1 | As Rapyd's interviewer, I want obvious P0 issues fixed before I see this, so the live review is about judgment, not bug-hunting. | Self-review scored per `docs/prompts/MASTER_PROMPT.md` Phase 12 categories; all P0s fixed. | ✅ Done |

## EPIC-13 — Live Interview Readiness ✅

| ID      | Story                                                                                                                                                               | Acceptance Criteria                                                                                                      | Status  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| US-13.1 | As the candidate, I want a prepared, honest answer for every likely question about this repo, so I can defend real decisions instead of improvising under pressure. | 25 anticipated questions answered, each grounded in actual code; anything indefensible flagged rather than glossed over. | ✅ Done |

## EPIC-14 — API Documentation & Access Control ✅

_Not part of MASTER_PROMPT's original 13 phases — added 2026-09-08 by direct user request._

| ID      | Story                                                                                                                                                                      | Acceptance Criteria                                                                                                                                                                                                                                     | Status  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-14.1 | As a reviewer or integrator, I want an interactive OpenAPI (Swagger) UI documenting every endpoint, so I can understand and try the API without reading controller source. | A Swagger UI route serves an OpenAPI 3.0 spec covering all 5 existing endpoints (summary, list exceptions, get exception by id, export, explanation) with request/response schemas and error shapes documented.                                         | ✅ Done |
| US-14.2 | As Rapyd, I want the Swagger UI gated behind HTTP Basic Auth, so API documentation (and its "try it out" surface) isn't publicly exposed without credentials.              | Requesting the docs route without an `Authorization: Basic` header returns `401` with a `WWW-Authenticate` challenge; correct env-configured credentials render the UI; wrong credentials return `401`.                                                 | ✅ Done |
| US-14.3 | As an engineer, I want the documented contract to stay honest about what the API actually does, so the docs can't silently drift from the real behavior.                   | The spec's documented status codes and response shapes are checked against the existing Supertest integration suite (either by generating the spec from the same Zod schemas already validating requests, or a dedicated test asserting the two agree). | ✅ Done |

## EPIC-15 — Dashboard Authentication ✅

_Not part of MASTER_PROMPT's original 13 phases — added 2026-09-08 by direct user request._

| ID      | Story                                                                                                                                                                                            | Acceptance Criteria                                                                                                                                                                                | Status  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-15.1 | As a merchant, I want to log in with credentials before seeing any reconciliation data, so the dashboard isn't openly accessible to anyone with the URL.                                         | Unauthenticated requests to the dashboard route redirect to a login page; unauthenticated requests to any `/api/reconciliation/*` endpoint return `401`, not the current mocked M-104 data.        | ✅ Done |
| US-15.2 | As Rapyd, I want merchant identity resolved from the authenticated session server-side, so a real login integrates with the existing merchant-isolation non-negotiable rather than weakening it. | `attachMerchantContext` (or its replacement) derives `req.merchantId` from a verified session/token, never from client input; all existing cross-merchant-isolation tests keep passing unmodified. | ✅ Done |
| US-15.3 | As a merchant, I want to log out and have that session invalidated, so a shared or public machine doesn't leave my reconciliation data exposed after I walk away.                                | Logout clears the session/token; a request replaying the old session afterward is rejected with `401`.                                                                                             | ✅ Done |

Scope note: "simple" is deliberate — this is a take-home-appropriate login (e.g. one or a
handful of demo accounts, hashed passwords, a signed session cookie or JWT), not a
production-grade identity system (no SSO, no password reset flow, no MFA). The security floor
that is **not** negotiable regardless of how simple the rest is: passwords are never stored in
plaintext, and `merchantId` is still never trusted from anything client-supplied post-login —
this epic replaces _how_ the session is established, not the isolation rule itself.

## EPIC-16 — Toolbar Redesign & Advanced Filtering ✅

_Not part of MASTER_PROMPT's original 13 phases — added 2026-09-08 by direct user request._

| ID      | Story                                                                                                                                                                                              | Acceptance Criteria                                                                                                                                                                                             | Status  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-16.1 | As a merchant, I want to click an exception breakdown pill to filter the table to just that reason, so I don't have to open a separate control to narrow it down.                                  | Each pill (including "All") is a real button; clicking one sets the table's reason filter (or clears it for "All"); the active pill has a visually distinct (brand-colored) state.                              | ✅ Done |
| US-16.2 | As a merchant, I want the Filter and Sort icons in the toolbar to actually work, so they're a real alternative to the reason dropdown and column-header sort, not decoration.                      | Filter icon opens a popover with the reason filter; Sort icon opens a popover with sort field + order; both apply to the table via the same URL-backed filter state the rest of the page already uses.          | ✅ Done |
| US-16.3 | As a merchant, I want to export the current filtered/sorted view in CSV, Excel, or PDF, so I can share or archive it in whatever format my downstream process expects.                             | Export icon opens a menu of three formats; each downloads a real file (CSV text, a valid .xlsx workbook, a valid .pdf) reflecting the current reason/date/sort filters, scoped to the authenticated merchant.   | ✅ Done |
| US-16.4 | As a merchant, I want a Kibana-style date range picker (quick relative presets plus an absolute range) with a refresh action, so picking a time window feels familiar and I can manually re-fetch. | Clicking the range control opens a panel with relative presets (Today, Last 7/30/90 days, Last 6 months/1 year) and absolute start/end date inputs; a separate Refresh button re-fetches the summary and table. | ✅ Done |

Scope note: apps/api's date filters are day-granularity (`YYYY-MM-DD`), matching the source CSVs
(`data/*.csv` have no time-of-day component) — a relative preset like "Last 7 days" resolves to
concrete dates against real wall-clock time immediately, rather than staying a live label that
could go stale; the range button always displays the actual applied dates. See
`docs/sessions/2026-09-08-epic16-toolbar-redesign.md`.
