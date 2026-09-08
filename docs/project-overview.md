# Project Overview — Start Here

Orientation for anyone — including a fresh Claude Code session — picking this repo up cold.
Read `CLAUDE.md` (root, auto-loaded), then this file, then the latest 1-2 entries in
`docs/sessions/README.md`. That's normally enough to resume work without re-reading the full
doc tree or re-deriving decisions that are already made.

## What this is

A merchant-facing settlement reconciliation portal for Rapyd (take-home build, Client Portal
Engineer role) — a phase-by-phase build following `docs/prompts/MASTER_PROMPT.md`. Full problem
framing is in `docs/product-spec.md`.

## Reading order for a new session

1. `CLAUDE.md` (root) — non-negotiables, already auto-loaded every session.
2. This file.
3. `docs/sessions/README.md` — read **only the top 1-2 entries** (most recent first). They carry
   the reasoning, pivots, and open threads from the last working session. Older entries are for
   archaeology ("why did we pick X back in Phase 2"), not routine context-loading.
4. `docs/project-plan.md` — the phase status table, source of truth for "where are we right now."
5. Whichever doc governs the phase you're about to work on (see the map below).

## Where things live, and why you shouldn't duplicate across them

| File                                                   | Answers                                                              | Update it when                           |
| ------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------- |
| `docs/project-plan.md`                                 | Which phase are we on, right now?                                    | A phase starts or completes              |
| `CHANGELOG.md`                                         | What shipped, grouped by phase?                                      | Anything ships                           |
| `docs/sessions/`                                       | What did we decide, change our mind about, defer, or miss — and why? | End of (or a natural pause in) a session |
| `docs/backlog/`                                        | Epic → Story → Task breakdown and per-task status                    | A task's status changes                  |
| `docs/architecture.md` §9 / `docs/product-spec.md` §14 | Standing assumptions                                                 | An assumption is made or overturned      |

Session logs are the only one of these that captures **reasoning and process** rather than
**state**. Don't copy CHANGELOG or project-plan content into a session log — link to it instead.

## Current state

_(Keep this in sync with `docs/project-plan.md` — they must never disagree.)_

- All 13 MASTER_PROMPT phases done, plus the cross-cutting EPIC-EX and Design Implementation
  sessions. See `docs/project-plan.md` for the full table.
- **Three new epics added and shipped 2026-09-08, by direct user request, outside MASTER_PROMPT's
  original scope:**
  - EPIC-16 (Toolbar Redesign & Advanced Filtering): the exception breakdown pills (including
    "All") are now clickable filters with a brand-colored active state; the toolbar's Filter,
    Sort, and Export icons open real popovers (reason filter, sort field/order, and a
    CSV/Excel/PDF export menu) instead of being decorative; a Kibana-style date range picker
    (relative presets + absolute range + Refresh) replaced the plain date inputs. See
    `docs/sessions/2026-09-08-epic16-toolbar-redesign.md`.
  - EPIC-14 (API Documentation & Access Control): interactive Swagger UI at `GET /api/docs/`
    covering all 5 reconciliation endpoints, gated behind HTTP Basic Auth (never the
    reconciliation endpoints themselves). The spec is hand-authored and kept honest by a test
    that asserts its documented routes match the Express router's real ones. See
    `docs/sessions/2026-09-08-epic14-api-docs.md`.
  - EPIC-15 (Dashboard Authentication): a real (if deliberately simple) login replacing the
    hardcoded `merchantId = 'M-104'` mock — one bcrypt-hashed demo account, a signed JWT in an
    httpOnly session cookie, a login page, route protection, and a logout button that clears the
    client-side query cache. `attachMerchantContext` now verifies the session and rejects (401)
    requests without one, rather than always succeeding. Verified with a real Playwright-driven
    browser against both dev servers (login, wrong-password error, session persists across
    reload, logout, dashboard unreachable afterward). See
    `docs/sessions/2026-09-08-epic15-dashboard-auth.md`.
  - Both were planned in `docs/sessions/2026-09-08-epic14-15-planning.md` before implementation.
- Phase 13 (Live Interview Prep): `docs/interview-prep/` — 25 questions grounded strictly in this
  repository (MASTER_PROMPT's own 20-question focus list plus 5 more specific to choices this
  repo makes), each with what's being tested, a scripted 1-2 minute answer, and likely follow-ups;
  plus a separate `do-not-claim.md` listing every place an answer should be honest about a known
  gap rather than defended as more than it is. See
  `docs/sessions/2026-09-08-phase13-interview-prep.md`.
- Phase 12 (Final Engineering Review): full repository inspection (not just this file's own
  self-reported gaps) before any code changes, per MASTER_PROMPT. Scored ~9/10 composite across
  12 dimensions -- no P0s, no P1s; every gap found was already tracked below. One P2 fixed: the
  `reason` URL filter wasn't validated against the known reason list before being cast (its
  `sortBy`/`sortOrder` siblings in the same file already did this). See
  `docs/sessions/2026-09-08-phase12-final-review.md` for the full scored report and what was
  specifically searched for (hardcoded results, merchant leakage, float money bugs, business
  logic misplacement, inaccessible table rows, LLM hallucination risk, dead code).
- Phase 11 (README): root `README.md` rewritten from its EPIC-EX-era "in progress" version into
  the full submission README -- every checklist item MASTER_PROMPT specifies, each substantive
  section linking to the doc that owns that topic rather than duplicating it. See
  `docs/sessions/2026-09-07-phase11-readme.md`.
- Phase 10 (Stakeholder Memo): `docs/stakeholder-memo.md`, ~1 page, non-technical, for the Head
  of Merchant Support -- what merchants can now do, what still needs a human, the one trade-off
  made, the support-contact-reduction metric, and a plain-language AI-explanation summary plus
  disclosure. See `docs/sessions/2026-09-07-phase10-stakeholder-memo.md`.
- Phase 9 (Accessibility Review): found and fixed a real focus-trap bug (Tab could escape the
  drawer entirely past the last reachable element — see `docs/accessibility.md` §4) plus two
  color tokens inherited from the approved design that failed WCAG AA contrast. Verified the
  regression test actually fails without the fix, not just that it passes with it. Also added
  heading structure that was almost entirely missing (one `<h1>` on the whole page before this).
  See `docs/sessions/2026-09-07-phase9-accessibility.md`.
- Phase 8 (LLM Explanation Feature): `ExceptionExplanationProvider` interface +
  `MockExplanationProvider`, replacing the Phase 4 stub. Two independent fallback guards
  (provider throws, or output is too short/long/contains banned speculative language) both route
  to the same guaranteed deterministic explanation, tagged `generatedBy: 'fallback'` so the
  frontend never claims AI involvement that didn't happen. `docs/ai-design.md` covers prompt
  design, grounding, hallucination controls, failure UX, PII handling, and the ship/no-ship call.
  See `docs/sessions/2026-09-07-phase8-llm-explanation.md`.
- The dashboard is real, runnable, and **now styled**: `npm run dev:api` + `npm run dev:web`,
  open `http://localhost:5173` — you'll land on a login page first (demo: `m104@rapyd.com` /
  `m104@123`, see EPIC-15 above). Once signed in, it renders live against M-104's real data —
  status, summary cards, exception breakdown, filters, sortable/paginated table, export, and a
  real accessible exception-detail drawer (focus trap, Escape, focus return, Details / Settlement
  vs. Ledger / AI Explain tabs). Visual design applied from `docs/design/Rapyd Settlement
Reconciliation Final Design - Interactive Prototype.html` (CSS Modules, design tokens,
  animations) — see `docs/sessions/2026-09-07-design-implementation.md`. Still **desktop-first**
  (a 2-column card fallback exists at narrow widths, but no full responsive audit — see below).
- No git commits yet — everything so far is working-tree state on `master`. First commit will
  need a deliberate, reviewed `git add` (see CLAUDE.md's git-safety guidance).

## Ground-truth figures (verified — Phase 3 engine output matches)

The real M-104 numbers, confirmed by running the Phase 3 reconciliation engine
(`packages/shared`) against `data/settlement_export.csv` + `data/ledger_export.csv`:

- **14 checked, 9 matched, 5 exceptions**: T1006 `MISSING_LEDGER` (1,384.66 AED), T1013
  `AMOUNT_MISMATCH` (24.31 USD difference), T1008 `DUPLICATE_LEDGER`, T1054 `DATE_MISMATCH`,
  T1045 `MISSING_SETTLEMENT` (148.65 AED).
- Financial impact by currency: **AED 1,533.31** (= T1006's 1,384.66 + T1045's 148.65 —
  MISSING_LEDGER and MISSING_SETTLEMENT combined, not one exception alone) and **USD 24.31**
  (T1013's difference).

These match the corrected Phase 1 mockup figures exactly (see the EPIC-EX session log) — the
engine is validated against known-correct numbers, not just against its own unit tests.

## Known open gaps (not scheduled by any MASTER_PROMPT phase — decide before submission)

- **No data-freshness indicator** on the dashboard (`docs/product-spec.md` §14 self-review) —
  flagged as the most likely support-escalation gap if shipped as-is. Still open.
- **Export scope undecided**: exceptions-only vs. exceptions + matched transactions. Still open
  (current export is exceptions-only).
- **Full responsive/mobile audit not done** — the design pass added a 2-column summary-card
  fallback at narrow widths as a side effect, but the table/drawer/toolbar haven't been audited
  for small screens. See `docs/sessions/2026-09-07-phase5-react-dashboard.md` and
  `docs/sessions/2026-09-07-design-implementation.md`.
- **Topbar help/notification icons and drawer footer buttons (Download Receipt / Contact
  Support) from the approved design were intentionally left out** — no real functionality is
  defined for them anywhere in the docs, and a button that does nothing was judged worse than
  not having it. Decide before submission whether product wants them stubbed in anyway.
- **No per-journey Playwright e2e specs** — still just the one smoke spec from EPIC-EX. The
  dashboard now exists (Phases 5-6), which is what the smoke spec's own comment said was the
  trigger to write real journey specs, but no MASTER_PROMPT phase schedules this work. See
  `docs/sessions/2026-09-07-phase7-frontend-tests.md`.
- **Drawer tabs use individually-Tab-reachable buttons, not the "roving tabindex" WAI-ARIA tabs
  pattern** (only the active tab in the Tab sequence, arrow keys move between them). Not a WCAG
  failure — arrow-key support already exists as an enhancement — but noted in
  `docs/accessibility.md`'s "Deliberately not done" as worth revisiting now that the underlying
  focus-trap bug it was avoiding interacting with is fixed.
- **`CURRENCY_MISMATCH`'s merchant-facing copy** (`exceptionLabels.ts`,
  `deterministicExplanation.ts`, and `MockExplanationProvider`'s template) is original content,
  not reviewed the way the original 5 reasons in `docs/product-spec.md` §9 were.
- **No logging/observability for explanation-provider fallbacks** — `docs/ai-design.md` §5 names
  this as the natural next step (a fallback from a provider failure vs. a fallback from unusable
  output are different signals worth alerting on separately) but it's not implemented; no logging
  infrastructure exists in `apps/api` yet at all.
- Resolved, no longer open: duplicate-ledger-entry detail now shows both ledger rows (Phase 6).

## Token-efficiency note for Claude Code

This doc set is deliberately cross-referenced instead of duplicated, specifically so a session
doesn't have to re-read everything to get oriented:

- Trust `docs/project-plan.md` for phase status without re-deriving it from CHANGELOG.
- Trust the latest session log for "what was decided and why" without reading older ones.
- Only open a full doc (`product-spec.md`, `architecture.md`) when the phase you're working on
  actually depends on its detail — the table above says which doc governs which question.
- Update `docs/sessions/` before ending a session (see `docs/sessions/README.md`) — that's what
  lets the next session skip re-deriving this one's reasoning.
