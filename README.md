# Settlement Reconciliation Portal

A merchant-facing portal so a Rapyd merchant can self-serve the question **"Did my money
reconcile correctly, and if not, what needs my attention?"** — instead of filing a support
ticket and waiting on a manual CSV cross-reference. Client Portal Engineer take-home, built
phase-by-phase per [`docs/prompts/MASTER_PROMPT.md`](docs/prompts/MASTER_PROMPT.md); status
tracked live in [`docs/project-plan.md`](docs/project-plan.md).

## The problem

Merchants have no self-service visibility into whether their settlements reconciled against
Rapyd's internal ledger. Every "where's my money?" question becomes a support ticket that
requires a human to manually cross-reference two CSV exports — even when the answer is "nothing's
wrong." Full problem framing, user journeys, and UX design: [`docs/product-spec.md`](docs/product-spec.md).

## The solution

A merchant logs in and immediately sees their overall reconciliation status — "all clear" or a
specific count of exceptions — never an empty table with no explanation. Each exception shows
exactly what's different (settlement vs. ledger amount, dates, duplicate entries) in plain
language, not raw data. Merchants can filter by reason (via clickable breakdown pills or the
toolbar) or date range (a Kibana-style relative/absolute picker), sort the table, export their
exceptions as CSV, Excel, or PDF, and open any exception for a merchant-facing explanation of
what happened and what to do
next — including an AI-generated explanation, grounded in the same numbers already on screen,
with a guaranteed safe fallback if it's ever unavailable.

Every state a merchant might actually see is a first-class UI state, not an afterthought:
loading, all-clear (a positive outcome, not an empty one), populated, and error (with retry,
never a raw stack trace).

## Screenshots

No committed screenshots in this repo — the approved visual design lives in
[`docs/design/`](docs/design/) as an interactive HTML prototype, and the shipped implementation
matches it closely (see the Design Implementation entry in
[`docs/sessions/`](docs/sessions/README.md)). Run it locally (below) to see the real thing.

## Tech stack

| Layer               | Choice                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Backend             | Node.js, TypeScript, Express                                                                      |
| Frontend            | React, TypeScript, Vite                                                                           |
| Server state        | TanStack Query                                                                                    |
| Client UI state     | Redux Toolkit — scoped to non-shareable UI state only; see `docs/standards/frontend-standards.md` |
| Styling             | CSS Modules + design tokens (`apps/web/src/styles/`) — no CSS framework dependency                |
| Validation          | Zod                                                                                               |
| API docs            | OpenAPI 3.0 + `swagger-ui-express`, gated behind HTTP Basic Auth                                  |
| Authentication      | Signed JWT in an httpOnly session cookie, `bcryptjs`-hashed demo credentials                      |
| Backend tests       | Jest + Supertest                                                                                  |
| Frontend unit tests | Jest + React Testing Library                                                                      |
| Frontend e2e tests  | Playwright                                                                                        |
| Pre-commit gate     | Husky + lint-staged (lint + typecheck)                                                            |
| Commit messages     | Conventional Commits, enforced via commitlint + Husky `commit-msg`                                |
| CI                  | GitHub Actions — lint, typecheck, unit tests, build, e2e on every push/PR                         |
| Monorepo            | npm workspaces (three packages didn't justify Nx/Turborepo)                                       |

## Architecture

```text
CSV repositories → normalized records → reconciliation engine → service layer
  → REST API (Express) → typed API client (fetch) → TanStack Query cache → React UI
```

- **`packages/shared`** — framework-free domain types and the reconciliation engine itself. Pure
  TypeScript, no Express, no React, no I/O — the one thing in this repo that's exhaustively unit
  testable in isolation.
- **`apps/api`** — reads the CSVs, calls the engine, exposes it over REST, enforces merchant
  isolation. `route → controller → service → repository`, controllers kept thin.
- **`apps/web`** — React dashboard. Talks to the API only through a typed client; never imports
  `apps/api` or touches CSVs/reconciliation logic directly.

Full breakdown (data flow, merchant isolation strategy, money-precision approach, test strategy,
error handling, standing assumptions): [`docs/architecture.md`](docs/architecture.md).

## How to run

```bash
npm install

npm run dev:api      # Express API on http://localhost:4000
npm run dev:web      # Vite dev server on http://localhost:5173 (proxies /api to the API)
```

Open `http://localhost:5173` — you'll land on a login page. Sign in with the demo account:
**`m104@rapyd.com` / `rapyd@2026`** (override via `DEMO_LOGIN_USERNAME` / `DEMO_LOGIN_PASSWORD` env
vars). A pre-commit hook (Husky + lint-staged) runs lint/format/typecheck automatically on
`git commit` — no extra setup beyond `npm install`.

Interactive API docs (Swagger UI) are at `http://localhost:4000/api/docs/`, gated behind HTTP
Basic Auth — default dev credentials `admin` / `admin123` (override via the `SWAGGER_DOCS_USER` /
`SWAGGER_DOCS_PASSWORD` env vars in any real deployment). This gate protects the documentation
surface only; it has no bearing on the reconciliation endpoints' own merchant-session auth.

## How to test

```bash
npm run typecheck    # all workspaces
npm run lint
npm run test         # unit tests, all workspaces (143 tests: 57 apps/api, 58 apps/web, 28 packages/shared)
npm run test:e2e     # Playwright smoke test, apps/web (starts its own dev server)
npm run build        # packages/shared → apps/api → apps/web
```

## Sample merchant

Logging in with the demo account (`m104@rapyd.com` / `rapyd@2026`, see "How to run") establishes a
real, signed session (`apps/api/src/auth/`, `apps/api/src/middleware/merchantContext.ts`) that
resolves to merchant **`M-104`** — every `/api/reconciliation/*` request is scoped to whatever
merchant the session says, never a client-supplied value. `data/`'s CSVs span multiple merchants; M-104's slice
contains a representative mix — **14 transactions checked, 9 matched, 5 exceptions**, one of every
reason except `CURRENCY_MISMATCH` (which the current data never triggers, but the engine still
checks for it defensively).

## API endpoints

Under `/api/reconciliation`, all scoped to the authenticated merchant (`401` with no valid
session):

| Method | Path                          | Purpose                                                                                                        |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| GET    | `/summary`                    | Checked/matched/exception counts, exceptions-by-reason, financial impact by currency                           |
| GET    | `/exceptions`                 | Paginated, filterable (`reason`, `from`, `to`), sortable list of exceptions                                    |
| GET    | `/exceptions/:id`             | Full detail for one exception (by `transactionId`)                                                             |
| GET    | `/exceptions/export`          | CSV/Excel/PDF download (`?format=csv\|xlsx\|pdf`) of exceptions matching the same filters and sort as the list |
| POST   | `/exceptions/:id/explanation` | Merchant-facing explanation (see "AI explanation design" below)                                                |

Under `/api/auth` — establishes/ends the session the table above requires:

| Method | Path       | Purpose                                                                                                |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------ |
| POST   | `/login`   | `{ username, password }` → sets an httpOnly session cookie, `401` on invalid credentials               |
| POST   | `/logout`  | Clears the session cookie                                                                              |
| GET    | `/session` | `200` with `{ merchantId }` if logged in, `401` otherwise — used by the frontend to check auth on load |

`GET /api/health` also exists outside both namespaces for basic liveness checking.

Interactive documentation for every endpoint above (request/response schemas, error shapes, "try
it out") is served as a Swagger UI at `GET /api/docs/`, gated behind HTTP Basic Auth — see "How to
run" above. The OpenAPI spec is hand-authored (`apps/api/src/docs/openapiDocument.ts`) and kept
honest by a test that asserts its path list matches the Express router's actual registered routes,
not just a hand-maintained list that could quietly drift.

## Reconciliation rules

Deterministic, keyed on `merchantId + transactionId` (not `transactionId` alone — IDs aren't
guaranteed unique across merchants). At most one exception per key; when more than one problem
could apply, checked in this order, first match wins:

1. **`DUPLICATE_LEDGER`** — more than one ledger entry for this key. Checked first and
   exclusively, so one structural problem (an accidental double-entry) can't also masquerade as
   an amount or date mismatch against whichever duplicate happens to differ.
2. **`MISSING_LEDGER`** / **`MISSING_SETTLEMENT`** — one side has no record at all.
3. **`CURRENCY_MISMATCH`** — checked before amount comparison, since comparing amounts across
   different currencies is meaningless.
4. **`AMOUNT_MISMATCH`** — settlement's net amount (post-fee — what the merchant actually
   receives) differs from the ledger amount.
5. **`DATE_MISMATCH`** — amounts and currency agree but the recorded dates differ.

No match on any of the above → matched. Full rationale for the ordering:
`packages/shared/src/reconcile.ts`'s doc comment. Money is never a float anywhere in this
pipeline — CSV decimal strings are parsed once into integer minor units via string arithmetic,
never `parseFloat`; see `docs/architecture.md` §8.

## Assumptions

1. Authentication is a small, take-home-appropriate demo login (one bcrypt-hashed demo account,
   a signed JWT session cookie) — not a production identity system (no SSO, password reset, or
   MFA). The merchant-isolation boundary it feeds is real: `merchantId` is always resolved from
   the verified session server-side, never trusted from client input.
2. Settlement and ledger data are pre-loaded CSVs, not a live/streaming feed.
3. Reconciliation is per-merchant, per-transaction (`merchantId + transactionId` composite key).
4. The settlement's **net amount** (after fees) is the reconciliation target — what the merchant
   actually receives.
5. Each transaction has a single currency; no cross-currency conversion or aggregation.
6. Settlement data is treated as authoritative for what the processor sent — this system checks
   agreement between the two records, not whether the processor's own data is itself correct.
7. Exceptions require human judgment; the portal surfaces them, it doesn't auto-resolve them.
8. One logged-in merchant at a time — no parent/child merchant hierarchies in this build.

Full list with rationale: `docs/product-spec.md` §14.

## Accessibility

Built to a WCAG 2.1 AA baseline, reviewed with a dedicated pass (not just built-in-passing):
read every component against a full checklist, computed exact contrast ratios for every color
pair in use (not eyeballed), and drove the real running app with Playwright to test the complete
keyboard focus cycle — which is what caught the one real bug in that review: the drawer's focus
trap could escape entirely past its last reachable element, because the trap's "last focusable"
calculation counted a hidden tab panel that a real Tab keypress could never actually land on.
Fixed, with a regression test verified to actually fail without the fix.

Also fixed: two color tokens inherited from the approved design that failed WCAG AA contrast, and
a near-total absence of heading structure (the whole page had exactly one heading before this
review, despite `docs/product-spec.md` committing to "h1 page title, h2 sections").

Full write-up, the computed contrast table, and an interview-ready explanation of the three most
important decisions: [`docs/accessibility.md`](docs/accessibility.md).

## AI explanation design

The LLM is never the reconciliation engine — deterministic code alone decides whether an
exception exists, its reason, and its amounts. The explanation feature only turns those
already-decided facts into merchant-friendly prose, from a strict structured context (7 fields:
transaction id, reason, currency, settlement/ledger amount+date, difference, duplicate count) —
nothing else is ever available to it, so it structurally cannot reference a fact that wasn't
already decided. A mock provider stands in for a real LLM call today, behind the same interface a
real provider would implement. Two independent guards — the provider throwing, or its output
being too short/long or containing banned speculative language ("fraud", "stolen", "lost",
"liability") — both fall back to guaranteed-safe, deterministic, reason-keyed text; a merchant
never sees an AI failure as an error. The frontend badge is honest about which happened
("Auto-generated" vs. a plain "Standard explanation") rather than claiming AI involvement that
didn't occur.

Full design (prompt design, grounding, hallucination controls, failure UX, logging/observability,
PII handling, and the ship/no-ship recommendation): [`docs/ai-design.md`](docs/ai-design.md).

## Trade-offs

**We prioritized getting the reconciliation itself right — trustworthy results, a first-class
state for every outcome (including "all clear"), accessibility, and merchant-facing
explanations — over advanced analytics, real-time ingestion, and dispute workflows.** Every
number a merchant sees comes from fixed, auditable rules, not a best guess, and all four UX
states were built out deliberately rather than only the happy path. What we deferred: trend
charts (is my exception rate improving?), live/streaming settlement updates, and letting a
merchant start a dispute directly from the portal — reasonable next investments once the
reconciliation foundation is proven, not before. Non-technical version for a support-org
audience: [`docs/stakeholder-memo.md`](docs/stakeholder-memo.md).

## Production improvements

None of the following are implemented in this build — listed honestly as what a real production
deployment would still need, not glossed over:

- Database-backed ingestion (today: CSVs read from disk at process start)
- A production-grade identity system — SSO, password reset, MFA, multi-account support (today:
  one demo account, a hashed password, a signed session cookie; see "Assumptions")
- Role-based access control
- Background reconciliation processing (today: computed synchronously per request, cached
  in-process)
- Reconciliation versioning (re-running against updated data has no history/audit of what changed)
- Audit trails (who viewed/exported what, when)
- Observability (structured logging, metrics, alerting — `docs/ai-design.md` §5 specifically
  flags this gap for the explanation-provider fallback path)
- Rate limiting
- PII controls beyond "the domain model doesn't currently carry any" (see `docs/ai-design.md` §6)
- Multi-currency treatment beyond "never aggregate across currencies" (no conversion, no
  cross-currency reporting)
- Idempotent ingestion (re-running the same CSV twice has no dedup guarantee beyond what the
  reconciliation key naturally provides)
- Large-dataset pagination/database indexes (today's pagination is in-memory array slicing,
  fine for CSV-sized data, not for a real merchant base)

## AI-tool usage disclosure

This entire repository — architecture, reconciliation engine, API, dashboard, tests, and every
doc including this one — was built with **Claude Code** (Anthropic's agentic CLI), working
phase-by-phase under direct human review and direction at each step. `CLAUDE.md` documents the
non-negotiables it worked under; [`docs/sessions/`](docs/sessions/) is a per-session log of the
actual decisions, trade-offs, pivots, and bugs found along the way, kept specifically so this
process is inspectable rather than opaque. Where AI-generated content is merchant-facing (the
exception explanations), that's disclosed explicitly in-product (the "Auto-generated" badge) and
in [`docs/ai-design.md`](docs/ai-design.md), not left implicit.

## Documentation map

- [`docs/project-overview.md`](docs/project-overview.md) — start-here orientation for a new
  session: reading order, current state, verified ground-truth figures, known open gaps
- [`docs/sessions/`](docs/sessions/) — per-session log of decisions, pivots, deferrals, and bugs
  found — the "why," not just the "what"
- [`docs/product-spec.md`](docs/product-spec.md) — problem, users, journeys, UX states, exception
  language, accessibility commitment, success criteria
- [`docs/architecture.md`](docs/architecture.md) — system architecture and the decisions worth
  defending in review
- [`docs/ai-design.md`](docs/ai-design.md) — the explanation feature's design, grounding,
  hallucination controls, and ship recommendation
- [`docs/accessibility.md`](docs/accessibility.md) — the accessibility review, including the bug
  found and fixed
- [`docs/stakeholder-memo.md`](docs/stakeholder-memo.md) — non-technical summary for merchant
  support leadership
- [`docs/project-plan.md`](docs/project-plan.md) — phase-by-phase status
- [`docs/backlog/`](docs/backlog/) — Epics, User Stories, and Tasks
- [`docs/standards/`](docs/standards/) — backend and frontend coding standards
- [`docs/design/`](docs/design/) — the approved visual design (interactive HTML prototype)
- [`CHANGELOG.md`](CHANGELOG.md) — what changed, by phase
