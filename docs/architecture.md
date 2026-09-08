# Architecture

Settlement Reconciliation Portal — repository and system architecture. This document is the
Phase 2 deliverable per `docs/prompts/MASTER_PROMPT.md`: repo structure and tooling only, no
reconciliation logic or UI yet (that's Phase 3 onward).

## Repository layout

```text
apps/
  api/            Node + TypeScript + Express — REST API
  web/            React + TypeScript + Vite — merchant dashboard
packages/
  shared/         Framework-free domain types + reconciliation engine (Phase 3)
docs/             Product spec, architecture, stakeholder memo, AI design notes
data/             Source CSVs (settlement_export.csv, ledger_export.csv), as provided
```

This is an npm workspaces monorepo (not Nx/Turborepo) — three packages don't justify a build
orchestrator. Each workspace has its own `dev`/`build`/`typecheck`/`test` script; the root
`package.json` fans these out with `--workspaces --if-present`.

## 1. Components

| Component         | Responsibility                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared` | Normalized domain types (`SettlementRecord`, `LedgerRecord`, `ReconciliationException`, …) and the reconciliation engine itself. Pure TypeScript — no Express, no React, no I/O.                 |
| `apps/api`        | Reads the CSVs, calls the reconciliation engine, exposes it over REST, enforces merchant isolation. Express app is split into `app.ts` (construction, for testability) and `index.ts` (listens). |
| `apps/web`        | React dashboard. Talks to the API only through a typed client; never touches CSVs or reconciliation logic directly.                                                                              |

## 2. Data flow

```text
CSV repositories  →  normalized records  →  reconciliation engine  →  service layer
       →  REST API (Express)  →  typed API client (fetch)  →  TanStack Query cache  →  React UI
```

Each arrow is a one-way, one-purpose boundary:

- **CSV → normalized records**: parsing/coercion (string amounts → integer minor units, date
  parsing) happens once, at the edge. Nothing downstream touches raw CSV rows.
- **records → reconciliation engine**: pure function(s) in `packages/shared`. Deterministic,
  synchronous, side-effect-free — easy to unit test exhaustively (Phase 3).
- **engine → service → REST API**: the service layer (Phase 4) calls the engine and shapes
  results into API responses (pagination, filtering). Controllers stay thin — no business logic
  in route handlers.
- **REST API → React**: the frontend never imports the engine or CSV readers. It only knows the
  HTTP contract.

## 3. Reconciliation boundary

The reconciliation engine in `packages/shared` has **zero runtime dependencies on Express or
React**. This is enforced structurally, not by convention: `apps/api` and `apps/web` both
depend on `packages/shared`; `packages/shared` depends on nothing in `apps/*`. A circular
import would be a build error, not a lint warning.

Why this matters for a payments product specifically:

- The rules that decide "does this transaction reconcile" are the highest-stakes code in the
  system. Keeping them framework-free means they can be unit tested directly, without spinning
  up an HTTP server or a browser — fast tests, and tests that can't accidentally pass because a
  mock hid a bug.
- It also means the engine is reusable outside a request/response cycle later (e.g. a batch job,
  a CLI, a queue worker) without modification.

## 4. Merchant isolation strategy

The authenticated merchant is resolved once, by middleware, and never trusted from client input:

```ts
// apps/api/src/middleware/merchantContext.ts
app.use(attachMerchantContext); // verifies the session cookie, sets req.merchantId, or 401s
```

Every downstream handler reads `req.merchantId` — set by the server, not from `req.query` or
`req.body`. The service layer takes `merchantId` as an explicit parameter to every query, so a
request for another merchant's exception by ID returns 404, not another merchant's data. This is
the single control that prevents cross-merchant data leakage, so it's implemented as middleware
everything passes through, not as a convention route handlers are expected to remember.

**Updated by EPIC-15 (2026-09-08):** this middleware originally hardcoded `req.merchantId =
'M-104'`, standing in for "authentication is solved elsewhere" per the assessment brief. EPIC-15
replaced the mock with a real (if intentionally simple) login: `apps/api/src/auth/session.ts`
signs a JWT into an httpOnly cookie on successful login (`apps/api/src/controllers/
authController.ts`), and `attachMerchantContext` now verifies that cookie's signature and
extracts `merchantId` from its payload — rejecting the request with `401` if the cookie is
missing, expired, or fails verification, rather than always succeeding. The isolation guarantee
this section describes is unchanged: `merchantId` is still never read from anything the client
directly controls, only from a value the server itself signed.

## 5. API boundary

`apps/web` never imports `apps/api` code or the CSV files directly — only `packages/shared`'s
_types_ (for response shapes) and a typed `fetch`-based API client. This keeps the frontend
honest about what it actually knows: only what the API chooses to expose. Endpoints, request
validation (Zod), and response shapes are defined in Phase 4.

## 6. Test strategy

| Layer             | Tool                                 | What it verifies                                                                           |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `packages/shared` | Jest (Phase 3)                       | Reconciliation rules — the highest-value tests in the repo, run without HTTP or DOM        |
| `apps/api`        | Jest + Supertest                     | Route contracts, status codes, merchant isolation, validation errors                       |
| `apps/web` (unit) | Jest + React Testing Library + Babel | User-observable behavior — rendered text, roles, interactions — not implementation details |
| `apps/web` (e2e)  | Playwright                           | Full user journeys against a running dev server — see `docs/product-spec.md` §4            |

`apps/web` unit tests run on **Jest**, matching `docs/assessment-brief.pdf` Part 2 exactly
("Tests: Jest + React Testing Library covering your exceptions table"). An earlier version of
this repo used Vitest here (Vite-native, shares the dev server's transform pipeline) as a
documented deviation — re-auditing against the brief's literal wording surfaced that as an
unnecessary risk for something the brief names specifically, so it was corrected. Jest runs
against `apps/web`'s TypeScript/JSX via `babel-jest` (types are still fully checked separately
by `tsc --noEmit` in the `typecheck` script — Babel only strips types, it doesn't check them).

E2E coverage (Playwright) is additive, not requested by the brief. It's scaffolded early
(Engineering Standards phase) with one smoke spec so that real per-journey specs are just
written, not configured, once Phase 5/6 build the dashboard those journeys run against.

## 7. Error handling

- **Engine**: never throws for "bad" reconciliation data (e.g. a missing ledger row) — that's
  an expected outcome, represented as an `ReconciliationException`, not an error. The engine
  only throws for programmer errors (e.g. malformed input shape).
- **API**: a small set of typed error responses — `400` (invalid query params, via Zod),
  `404` (exception/merchant not found), `500` (unexpected failure). Controllers catch and map
  known error types; anything unhandled becomes a generic `500` with no internal detail leaked
  to the client (stack traces, file paths, SQL — never in the response body).
- **UI**: every data-fetching view has an explicit error state (see `docs/product-spec.md` §8) —
  merchant-friendly copy, a retry action, and no technical jargon. Loading/error/empty are
  first-class states, not implicit gaps in the happy path.

## 8. Monetary precision strategy

CSV amounts arrive as decimal strings (e.g. `"267.80"`). These are parsed **once**, at the CSV
boundary, into **integer minor units** (cents/fils — e.g. `26780`) and every reconciliation
comparison and arithmetic operation happens in that integer domain. Floating-point `number` is
never used to store or compare money — `0.1 + 0.2 !== 0.3` is exactly the kind of bug a
reconciliation engine cannot afford. Minor units are converted back to a decimal string only at
the presentation edge (API response, UI render).

## 9. Assumptions

- **No database in this phase.** Data is read from the provided CSVs at request time (or loaded
  once at process start) — no persistence layer, no migrations. A production version would swap
  the CSV repository for a database-backed one behind the same interface; the reconciliation
  engine and API contract would not need to change.
- **Single demo merchant account, real session mechanics.** One demo login resolves to
  `merchantId = M-104` (see §4's EPIC-15 update) — the session itself is real (signed JWT,
  httpOnly cookie, bcrypt-hashed password), but there's exactly one account and no
  signup/password-reset/MFA/multi-merchant support, which a production identity system would add
  behind the same `req.merchantId` contract without the rest of the app changing.
- **npm workspaces, not a monorepo tool.** Three packages and no need for remote caching or
  affected-graph builds — Nx/Turborepo would be unjustified complexity here.
- **Redux Toolkit, scoped narrowly.** The assessment brief allows "Redux or an equivalent if
  the state genuinely warrants it." Server state still lives entirely in TanStack Query, and
  shareable/bookmarkable state (filters, sort, pagination) still lives in URL search params —
  Redux does not duplicate either. It's used only for transient, non-shareable UI state (the
  exception drawer's open/selected state, toast notifications) that doesn't need to survive a
  refresh or be linkable. See `docs/standards/frontend-standards.md` "State management
  boundaries" for the exact rule and the anti-patterns to reject in review (e.g. caching API
  data in Redux, or putting filters there instead of the URL).

## Tooling

| Concern             | Tool                                                        | Notes                                                                      |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| Language            | TypeScript 5.5, `strict: true` + `noUncheckedIndexedAccess` | Shared `tsconfig.base.json`, extended per package                          |
| Lint                | ESLint 8 (`@typescript-eslint`, `eslint-plugin-react`)      | `.eslintrc.cjs` at root                                                    |
| Format              | Prettier                                                    | `.prettierrc.json` at root                                                 |
| Backend runtime     | Express 4                                                   | `apps/api`                                                                 |
| Backend dev server  | `tsx watch`                                                 | fast TS execution without a compile step                                   |
| Backend tests       | Jest + ts-jest + Supertest                                  | `apps/api`                                                                 |
| Frontend build      | Vite 5                                                      | `apps/web`                                                                 |
| Frontend unit tests | Jest + Babel + React Testing Library + jsdom                | `apps/web`                                                                 |
| Frontend e2e tests  | Playwright                                                  | `apps/web/e2e`                                                             |
| Server state        | TanStack Query 5                                            | `apps/web`                                                                 |
| Client UI state     | Redux Toolkit (scoped — see §9)                             | `apps/web/src/store`                                                       |
| Validation          | Zod                                                         | `apps/api` request/query validation (Phase 4)                              |
| API docs            | OpenAPI 3.0 + `swagger-ui-express`                          | `GET /api/docs/`, gated by HTTP Basic Auth (EPIC-14, `apps/api/src/docs/`) |
| Authentication      | `jsonwebtoken` + `bcryptjs` + `cookie-parser`               | Signed JWT session cookie (EPIC-15, `apps/api/src/auth/`)                  |
| Pre-commit gate     | Husky + lint-staged                                         | lint-staged (eslint --fix + prettier) + typecheck                          |
