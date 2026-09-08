# Tasks

Completed epics are broken down to real task granularity for traceability. Epics not yet started
are listed as coarse task groups — refined into concrete tasks when that phase begins (see
`docs/backlog/README.md` for why).

## EPIC-01 — Product Thinking & UX Framing

| Task                                                                                              | Story   | Status |
| ------------------------------------------------------------------------------------------------- | ------- | ------ |
| Analyze M-104's actual settlement/ledger rows to identify real exceptions before writing the spec | US-01.1 | ✅     |
| Write problem statement, primary user, user outcome                                               | US-01.1 | ✅     |
| Define 3 core user journeys with trigger/question/info/outcome                                    | US-01.1 | ✅     |
| Define goals, non-goals, information architecture                                                 | US-01.1 | ✅     |
| Design all 4 UX states (loading, all-clear, error, populated)                                     | US-01.1 | ✅     |
| Write merchant-facing labels/explanations/next-steps for all 5 exception types                    | US-01.2 | ✅     |
| Build ASCII wireframe + responsive strategy                                                       | US-01.1 | ✅     |
| Write WCAG 2.1 AA accessibility commitment                                                        | US-01.1 | ✅     |
| Define measurable business metric + measurement plan                                              | US-01.3 | ✅     |
| Self-review as Head of Merchant Support; identify weakest 3 decisions                             | US-01.1 | ✅     |
| Build 2 HTML UX-direction mockups grounded in real M-104 data                                     | US-01.1 | ✅     |
| Validate mockup stat numbers against source CSVs; fix 2 data-accuracy bugs found                  | US-01.1 | ✅     |
| Produce submission-ready PDF (`docs/to_submit/`)                                                  | US-01.1 | ✅     |

## EPIC-02 — Platform Foundation

| Task                                                                                     | Story   | Status |
| ---------------------------------------------------------------------------------------- | ------- | ------ |
| Scaffold npm workspaces monorepo (`apps/*`, `packages/*`)                                | US-02.1 | ✅     |
| Configure shared `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`)             | US-02.1 | ✅     |
| Configure ESLint + Prettier                                                              | US-02.1 | ✅     |
| Scaffold `apps/api`: Express app factory, health endpoint, Jest + Supertest              | US-02.1 | ✅     |
| Implement `attachMerchantContext` middleware                                             | US-02.3 | ✅     |
| Scaffold `apps/web`: Vite + React shell, TanStack Query provider                         | US-02.1 | ✅     |
| Scaffold `packages/shared` as the future reconciliation-engine home, zero framework deps | US-02.2 | ✅     |
| Write `docs/architecture.md` (9 required sections)                                       | US-02.1 | ✅     |
| Verify install → typecheck → test → build all pass clean                                 | US-02.1 | ✅     |

## EPIC-EX — Engineering Standards & Developer Experience

| Task                                                                                | Story   | Status |
| ----------------------------------------------------------------------------------- | ------- | ------ |
| Add Redux Toolkit + `react-redux`, scoped `uiSlice` (drawer + toasts only)          | US-EX.1 | ✅     |
| Wire `<Provider>` in `main.tsx` alongside `QueryClientProvider`                     | US-EX.1 | ✅     |
| Unit test `uiSlice` reducers                                                        | US-EX.1 | ✅     |
| Migrate `apps/web` from Vitest to Jest + Babel (match assessment brief exactly)     | US-EX.2 | ✅     |
| Configure `jest.config.cjs`, `babel.config.cjs`, jsdom environment                  | US-EX.2 | ✅     |
| Scaffold Playwright (`playwright.config.ts`, one smoke spec)                        | US-EX.3 | ✅     |
| Add Husky + lint-staged; write `.husky/pre-commit` (lint-staged + typecheck)        | US-EX.4 | ✅     |
| Write `CLAUDE.md` (project-wide non-negotiables + pointers)                         | US-EX.5 | ✅     |
| Write `docs/standards/backend-standards.md`                                         | US-EX.5 | ✅     |
| Write `docs/standards/frontend-standards.md` (incl. Redux/Query/URL state boundary) | US-EX.5 | ✅     |
| Re-audit assessment brief for stack mismatches (found: test runner)                 | US-EX.2 | ✅     |
| Install Playwright's Chromium binary; verify e2e smoke spec actually passes         | US-EX.3 | ✅     |
| Add GitHub Actions CI (`.github/workflows/ci.yml`): lint/typecheck/test/build/e2e   | US-EX.5 | ✅     |
| Add `.github/pull_request_template.md`                                              | US-EX.5 | ✅     |
| Add commitlint + Husky `commit-msg` hook (Conventional Commits)                     | US-EX.4 | ✅     |
| Verify typecheck/test/build/lint all still pass after every change above            | —       | ✅     |

## EPIC-03 — Reconciliation Engine

| Task                                                                                                                                                      | Story   | Status |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| Define normalized types (`SettlementRecord`, `LedgerRecord`, `ReconciliationResult`, `ReconciliationException`, `ExceptionReason`)                        | US-03.1 | ✅     |
| Implement the 5 exception rules + defensive `CURRENCY_MISMATCH` check (`reconcile.ts`)                                                                    | US-03.1 | ✅     |
| Define and document rule precedence (duplicate → missing → currency → amount → date)                                                                      | US-03.1 | ✅     |
| Implement CSV parsing → integer minor units at the boundary (`money.ts`, `parsing.ts`)                                                                    | US-03.4 | ✅     |
| Reconcile on merchantId + transactionId composite key throughout                                                                                          | US-03.3 | ✅     |
| Compute per-merchant summary + financial impact grouped by currency (never summed)                                                                        | US-03.2 | ✅     |
| Export public API surface from `packages/shared/src/index.ts`                                                                                             | US-03.1 | ✅     |
| Set up Jest + ts-jest for `packages/shared` (was a no-op test stub)                                                                                       | US-03.1 | ✅     |
| Unit tests: perfect match, missing ledger, missing settlement, duplicate ledger, amount mismatch, date mismatch, currency mismatch, precedence regression | US-03.1 | ✅     |
| Unit test: financial impact grouped by currency, never aggregated                                                                                         | US-03.2 | ✅     |
| Unit tests: merchant isolation, incl. same `transactionId` colliding across merchants                                                                     | US-03.3 | ✅     |
| Unit tests: money precision (float-drift regression), `money.ts` parse/format round-trip, malformed-input rejection                                       | US-03.4 | ✅     |
| Unit tests for `parsing.ts` (CSV → record mapping)                                                                                                        | US-03.1 | ✅     |
| Run full suite (28 tests) + typecheck + lint clean across all workspaces                                                                                  | —       | ✅     |
| Run engine against real M-104 CSVs; manually verify output (14 checked, 9 matched, 5 exceptions, matching the corrected Phase 1 mockup figures)           | US-03.1 | ✅     |

## EPIC-04 — Reconciliation API

| Task                                                                                                                                                                                                                        | Story           | Status |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------ |
| CSV repository: read + reconcile once per process, cache by merchant                                                                                                                                                        | US-04.1         | ✅     |
| Service layer: `getSummary`, `listExceptions` (filter/sort/paginate), `getExceptionById`, `listExceptionsForExport`                                                                                                         | US-04.1         | ✅     |
| Zod schemas for exceptions query params (`page`/`pageSize`/`reason`/`from`/`to`/`sortBy`/`sortOrder`) + cross-field `from <= to` check                                                                                      | US-04.2         | ✅     |
| `GET /api/reconciliation/summary`                                                                                                                                                                                           | US-04.1         | ✅     |
| `GET /api/reconciliation/exceptions` (paginated, filtered, sorted)                                                                                                                                                          | US-04.2         | ✅     |
| `GET /api/reconciliation/exceptions/:id`                                                                                                                                                                                    | US-04.4         | ✅     |
| `GET /api/reconciliation/exceptions/export` (CSV, same filters, no pagination)                                                                                                                                              | US-04.3         | ✅     |
| `POST /api/reconciliation/exceptions/:id/explanation` (Phase 4 stub — deterministic per-reason text)                                                                                                                        | —               | ✅     |
| Response DTOs: minor units → decimal strings only at the response edge                                                                                                                                                      | —               | ✅     |
| Catch-all error middleware (500, no leaked internals) + `asyncHandler` to forward async rejections                                                                                                                          | —               | ✅     |
| 17 Supertest integration tests: summary, pagination, filtering, sorting, validation errors (400), single-exception lookup, cross-merchant isolation by ID (404), export (incl. filtered + invalid-filter), explanation stub | US-04.1–US-04.4 | ✅     |
| Fix `packages/shared` build emitting ESM with no CJS consumer (blocked `apps/api` from importing it under Jest)                                                                                                             | —               | ✅     |
| Manually verify all 5 endpoints' response shapes against a running dev server                                                                                                                                               | —               | ✅     |
| Run full suite + typecheck + lint + build clean across all workspaces                                                                                                                                                       | —               | ✅     |

## EPIC-05 — Merchant Dashboard

| Task                                                                                                | Story   | Status      |
| --------------------------------------------------------------------------------------------------- | ------- | ----------- |
| Typed API client (`api/client.ts`, `api/reconciliation.ts`, `api/types.ts`)                         | —       | ✅          |
| One TanStack Query hook per endpoint (`useReconciliationSummary`, `useReconciliationExceptions`)    | —       | ✅          |
| `useExceptionsFilters`: filter/sort/page state read from and written to URL search params           | US-05.2 | ✅          |
| `StatusBanner`, `SummaryCards` (impact grouped by currency), `ExceptionBreakdown`                   | US-05.1 | ✅          |
| `FilterToolbar` (reason select + date range, all writing to URL state)                              | US-05.2 | ✅          |
| `ExceptionsTable`: sortable headers, keyboard-actionable row action, server-side pagination         | —       | ✅          |
| `ExportButton` (plain anchor, relies on the API's `Content-Disposition` header)                     | —       | ✅          |
| `exceptionLabels.ts` (merchant-facing copy from `docs/product-spec.md` §9)                          | —       | ✅          |
| All 4 UX states implemented in `Dashboard` (loading/error/all-clear/populated)                      | —       | ✅          |
| `ExceptionDetailPlaceholder`: minimal Phase 5 stub for the row action, replaced in Phase 6          | —       | ✅          |
| 19 tests: `Dashboard` (4 states + interactions), `ExceptionsTable`, `useExceptionsFilters`          | —       | ✅          |
| Manually verified in a real browser via Playwright driver script against live API + real data       | —       | ✅          |
| Fix: gate `useReconciliationExceptions` on `enabled` so it doesn't fire before there's data to show | —       | ✅          |
| Responsive: stacked cards on mobile (`docs/product-spec.md` §11)                                    | US-05.3 | 🧊 Deferred |

Responsive/mobile layout was explicitly deferred this phase — no CSS or media queries exist yet
at all (the UI is currently unstyled, semantic HTML only). See `docs/sessions/` for why this
wasn't silently treated as "not applicable yet."

## EPIC-06 — Exception Investigation

| Task                                                                                                                                                       | Story            | Status |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| `useReconciliationException(id)`: dedicated query hook for `GET /exceptions/:id`, independent of the table's currently-loaded page                         | US-06.1          | ✅     |
| `ExceptionDrawer`: title, transaction ID, settlement, ledger, computed difference, explanation, next step                                                  | US-06.1, US-06.3 | ✅     |
| Show both duplicate ledger entries for `DUPLICATE_LEDGER` (closes a gap flagged in the Phase 1 self-review)                                                | US-06.1          | ✅     |
| `useFocusTrap`: hand-rolled focus trap (move focus in, Tab-cycle, restore on close)                                                                        | US-06.2          | ✅     |
| Escape closes the drawer; `role="dialog"` + `aria-modal` + `aria-labelledby` accessible title                                                              | US-06.2          | ✅     |
| Verify table filters/pagination/scroll are preserved while the drawer is open (structural — no code needed since drawer state lives in Redux, not the URL) | —                | ✅     |
| 6 tests: content rendering, duplicate entries, focus-in, focus-return-on-close, Escape-closes                                                              | —                | ✅     |
| Fix flaky focus test caused by cross-test state leakage (tests not closing the drawer before ending)                                                       | —                | ✅     |
| Manually verified in a real browser: both exception types' drawers, Escape, Tab-cycle, zero console errors                                                 | —                | ✅     |

## EPIC-07 — Frontend Test Coverage

| Task                                                                                                         | Story   | Status |
| ------------------------------------------------------------------------------------------------------------ | ------- | ------ |
| Audit existing Phase 5-6 tests against the assessment brief's required coverage list, item by item           | US-07.1 | ✅     |
| Add exceptions-table-scoped loading state test                                                               | US-07.1 | ✅     |
| Add exceptions-table-scoped error test with a retry that actually recovers (not just presence of the button) | US-07.1 | ✅     |
| Strengthen page-level retry test to assert recovery, not just that the alert/button render                   | US-07.1 | ✅     |
| Strengthen reason-filter test to assert rendered content changes, not just fetch call args                   | US-07.1 | ✅     |
| Add sort-toggle direction test (asc↔desc on repeat click, reset to asc on new column)                        | US-07.1 | ✅     |
| Add pagination integration test (Dashboard → updateFilters → refetch with new page)                          | US-07.1 | ✅     |
| Add export-link-reflects-filters test                                                                        | US-07.1 | ✅     |
| Add `aria-sort` attribute assertion directly on `ExceptionsTable`                                            | US-07.1 | ✅     |
| New `ExportButton.test.tsx`: URL construction in isolation                                                   | US-07.1 | ✅     |
| Audit whole suite for snapshot tests / `data-testid` / non-accessible queries (none found)                   | —       | ✅     |
| Run full suite 4x consecutively to confirm no flakiness (25 → 33 tests)                                      | —       | ✅     |
| Confirm the existing Playwright e2e smoke spec still passes against the real dashboard                       | —       | ✅     |

Per-journey Playwright specs (`docs/standards/frontend-standards.md` "E2E" section, and the
smoke spec's own comment: "Real journeys ... get their own specs here once the dashboard exists
\(Phase 5+\)") are **not** written yet — MASTER_PROMPT's 13 phases never explicitly schedule this
work, so it's flagged rather than done speculatively. See `docs/sessions/` for the same
gap-flagging treatment as the responsive-layout gap from Phase 5.

## EPIC-08 — AI-Assisted Explanations

| Task                                                                                                                                                                                                     | Story            | Status |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| `explanationProvider.ts`: `ExplanationContext` (7-field DTO), `ExceptionExplanationProvider` interface, prompt builder                                                                                   | US-08.1          | ✅     |
| `mockExplanationProvider.ts`: per-reason template implementation, bound by the same system intent a real LLM would be                                                                                    | US-08.1          | ✅     |
| `deterministicExplanation.ts`: reason-keyed fallback text (replaces the Phase 4 stub)                                                                                                                    | US-08.2          | ✅     |
| `explanationService.ts`: `getExplanation` orchestration, `isUsable` (length bounds + banned-language regex)                                                                                              | US-08.2          | ✅     |
| Wire `postExceptionExplanationHandler` to `getExplanation` instead of the old stub                                                                                                                       | US-08.1          | ✅     |
| `ExceptionDrawer.tsx` "AI Explain" tab: renders explanation, badges `generatedBy` (real provider vs. fallback)                                                                                           | US-08.3          | ✅     |
| New tests: `explanationProvider.test.ts`, `mockExplanationProvider.test.ts`, `deterministicExplanation.test.ts`, `explanationService.test.ts` — incl. provider-throws and unusable-output fallback cases | US-08.1, US-08.2 | ✅     |
| Update `reconciliation.test.ts` fixtures for the new `generatedBy: 'mock'` value                                                                                                                         | —                | ✅     |
| Write `docs/ai-design.md` (prompt design, grounding, hallucination controls, failure UX, logging, PII, ship/no-ship)                                                                                     | US-08.1–US-08.3  | ✅     |
| Run full suite + typecheck + lint clean across all workspaces                                                                                                                                            | —                | ✅     |

## EPIC-09 — Accessibility Compliance

| Task                                                                                                                 | Story   | Status |
| -------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| Compute exact WCAG AA contrast ratios for every color token pair actually in use (script, not eyeballing)            | US-09.2 | ✅     |
| Fix 2 failing tokens found (`--color-text-muted`, `--color-border-strong`)                                           | US-09.2 | ✅     |
| Add missing heading structure (`ExceptionBreakdown` heading + `aria-labelledby`, visually-hidden `<h2>Summary</h2>`) | US-09.2 | ✅     |
| Drive the running app with Playwright through a full keyboard Tab cycle, logging `document.activeElement`            | US-09.1 | ✅     |
| Find and fix the focus-trap escape bug (`isReachable` filter on hidden tab panels) in `useFocusTrap.ts`              | US-09.1 | ✅     |
| Add regression test for the focus-trap bug; verify it fails without the fix before restoring the fix                 | US-09.1 | ✅     |
| Restructure `ExceptionDrawer` tabs to the ARIA tabs pattern (`role="tablist"`/`"tab"`/`"tabpanel"`, arrow-key nav)   | US-09.1 | ✅     |
| Convert `AppShell` nav `<span>`s to semantic `<ul>`/`<li>`                                                           | US-09.1 | ✅     |
| Write `docs/accessibility.md` (contrast table, bug narrative, "Deliberately not done", 3-decision summary)           | US-09.2 | ✅     |
| Run full suite (39 `apps/web` tests) + typecheck + lint clean                                                        | —       | ✅     |

## EPIC-10 — Stakeholder Communication

| Task                                                                                              | Story   | Status |
| ------------------------------------------------------------------------------------------------- | ------- | ------ |
| Draft `docs/stakeholder-memo.md`: what merchants can now self-serve vs. what still needs a ticket | US-10.1 | ✅     |
| Add the support-contact-reduction metric and how it would be measured                             | US-10.1 | ✅     |
| State the one intentional trade-off made, in plain language                                       | US-10.1 | ✅     |
| Add a plain-language AI-explanation summary plus disclosure                                       | US-10.1 | ✅     |
| Review for zero engineering jargon; keep to ~1 page                                               | US-10.1 | ✅     |

## EPIC-11 — Submission Documentation

| Task                                                                                                                                                                        | Story   | Status |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| Rewrite `README.md` from its EPIC-EX-era "in progress" version into the full submission README                                                                              | US-11.1 | ✅     |
| Cover problem, solution, tech stack, architecture, how to run/test, sample merchant, API endpoints, reconciliation rules, assumptions, accessibility, AI design, trade-offs | US-11.1 | ✅     |
| List MASTER_PROMPT's exact "production improvements" items, honestly marked as not implemented, with context per item                                                       | US-11.1 | ✅     |
| Link every substantive section to the doc that owns that topic instead of duplicating it                                                                                    | US-11.1 | ✅     |
| Run `npx prettier --write` on the README                                                                                                                                    | —       | ✅     |

## EPIC-12 — Engineering Quality Review

| Task                                                                                                                                                                                         | Story   | Status |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| Read the full reconciliation engine, entire API layer, and state-boundary-critical frontend files end to end before scoring                                                                  | US-12.1 | ✅     |
| Score all 12 `docs/prompts/MASTER_PROMPT.md` Phase 12 dimensions, grounded in the code just read (not carried-over numbers)                                                                  | US-12.1 | ✅     |
| Search specifically for hardcoded results, merchant leakage, float money bugs, business-logic misplacement, inaccessible table rows, LLM hallucination risk, dead code, naming inconsistency | US-12.1 | ✅     |
| Find and fix the one real P2: unvalidated `reason` URL query param in `useExceptionsFilters.ts`                                                                                              | US-12.1 | ✅     |
| Run tests, typecheck, lint, production build; produce the submission-readiness report                                                                                                        | US-12.1 | ✅     |

## EPIC-13 — Live Interview Readiness

| Task                                                                                                                    | Story   | Status |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| Re-read `docs/architecture.md`, `docs/ai-design.md`, and the Phase 12 review's findings before drafting answers         | US-13.1 | ✅     |
| Draft 25 questions (MASTER_PROMPT's 20-question focus list + 5 more grounded in specific repo decisions)                | US-13.1 | ✅     |
| For each: what's being tested, a scripted 1-2 minute answer citing actual files/decisions, likely follow-ups            | US-13.1 | ✅     |
| Write `docs/interview-prep/do-not-claim.md`: an honest list of every self-identified gap, framed as "if asked X, say Y" | US-13.1 | ✅     |
| No code changes this phase, per MASTER_PROMPT's "stop coding" instruction                                               | —       | ✅     |

## EPIC-14 — API Documentation & Access Control

| Task                                                                                                                                                         | Story   | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ |
| Hand-author the OpenAPI 3.0 spec (`apps/api/src/docs/openapiDocument.ts`) covering all 5 endpoints, mirroring the actual serializer/error shapes             | US-14.1 | ✅     |
| Add `requireBasicAuth` middleware (`apps/api/src/middleware/basicAuth.ts`) — constant-time credential comparison, `WWW-Authenticate` challenge on failure    | US-14.2 | ✅     |
| Mount Swagger UI at `GET /api/docs/`, gated by `requireBasicAuth`, credentials from `SWAGGER_DOCS_USER`/`SWAGGER_DOCS_PASSWORD` env vars (defaulted for dev) | US-14.2 | ✅     |
| Add `swagger-ui-express` + `@types/swagger-ui-express` to `apps/api`                                                                                         | —       | ✅     |
| `openapiDocument.test.ts`: derive the "actual" route list from the Express router's own `stack` and assert it matches the spec's documented paths exactly    | US-14.3 | ✅     |
| `basicAuth.test.ts`: unit tests for no-credentials, wrong-credentials, malformed-header, and correct-credentials cases                                       | US-14.2 | ✅     |
| `app.test.ts`: integration tests confirming the mounted `/api/docs/` route is actually gated end to end                                                      | US-14.2 | ✅     |
| Do not gate `/api/reconciliation/*` behind Basic Auth — verified reconciliation endpoints still work unauthenticated by the mock session, same as before     | —       | ✅     |
| Manually verify against a running dev server: 401 with no credentials, 401 with wrong credentials, 200 + real Swagger UI HTML with correct credentials       | —       | ✅     |
| Document the route, default credentials, and env var overrides in `README.md` and `docs/architecture.md`'s tooling table                                     | US-14.1 | ✅     |
| Run full suite + typecheck + lint clean across all workspaces                                                                                                | —       | ✅     |

## EPIC-15 — Dashboard Authentication

| Task                                                                                                                                                                                                                                                                | Story            | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| `apps/api/src/auth/userStore.ts`: one demo user, bcrypt-hashed password, `DEMO_LOGIN_USERNAME`/`DEMO_LOGIN_PASSWORD` env overrides                                                                                                                                  | US-15.1          | ✅     |
| `apps/api/src/auth/session.ts`: `signSession`/`verifySession` — a stateless JWT (`AUTH_JWT_SECRET`, 8h expiry)                                                                                                                                                      | US-15.1          | ✅     |
| `apps/api/src/controllers/authController.ts` + `routes/auth.ts`: `POST /login`, `POST /logout`, `GET /session`                                                                                                                                                      | US-15.1          | ✅     |
| Rewrote `apps/api/src/middleware/merchantContext.ts`: reads the `rapyd_session` httpOnly cookie, verifies it, sets `req.merchantId`, or `401`s — replacing the hardcoded mock                                                                                       | US-15.2          | ✅     |
| Mounted `cookie-parser`; `app.ts` ordering: `/api/health`, `/api/docs`, `/api/auth` before `attachMerchantContext`, then `/api/reconciliation`                                                                                                                      | US-15.2          | ✅     |
| `cors({ origin: WEB_ORIGIN, credentials: true })` — required for the session cookie to be honored at all                                                                                                                                                            | —                | ✅     |
| Added `bcryptjs`, `jsonwebtoken`, `cookie-parser` (+ types) to `apps/api`                                                                                                                                                                                           | —                | ✅     |
| Updated `reconciliation.test.ts` (16 tests) to log in via a `supertest.agent` first, since every request now genuinely requires a session                                                                                                                           | US-15.2          | ✅     |
| Added `unauthenticated access` test: all 5 reconciliation endpoints return `401 UNAUTHENTICATED` with zero session                                                                                                                                                  | US-15.2          | ✅     |
| New `auth.test.ts`: login success/wrong-password/unknown-user/missing-field, session-check authenticated/unauthenticated, logout invalidates the session end-to-end                                                                                                 | US-15.1, US-15.3 | ✅     |
| `apps/web/src/api/auth.ts`, `hooks/useAuthSession.ts`: typed client + query for session/login/logout                                                                                                                                                                | US-15.1          | ✅     |
| `apps/web/src/auth/RequireAuth.tsx`: gates the dashboard route, redirects to `/login` on a failed session check                                                                                                                                                     | US-15.1          | ✅     |
| `apps/web/src/auth/LoginPage.tsx` + `.module.css`: merchant-ID/password form, inline calm error (no native `alert()`)                                                                                                                                               | US-15.1          | ✅     |
| `App.tsx`: real `<Routes>` (`/login` public, `/` behind `RequireAuth`) — this app's first actual routing beyond URL search params                                                                                                                                   | US-15.1          | ✅     |
| `AppShell.tsx`: "Log out" button — calls `logout()`, clears the TanStack Query cache (`queryClient.clear()`), navigates to `/login`                                                                                                                                 | US-15.3          | ✅     |
| `apiFetch` (`api/client.ts`): `credentials: 'include'` so the session cookie is sent even cross-origin in a real deployment                                                                                                                                         | —                | ✅     |
| New `App.test.tsx` cases, `LoginPage.test.tsx`, `RequireAuth.test.tsx`: 12 new `apps/web` tests covering login success/failure, redirect-when-logged-out, session-survives-render                                                                                   | US-15.1, US-15.2 | ✅     |
| Manually verified with a real Playwright-driven browser against both real dev servers: logged-out redirect, wrong-password error, successful login, session survives reload, logout, dashboard unreachable after logout — all 6 checks passed, screenshots reviewed | —                | ✅     |
| Updated `README.md`, `docs/architecture.md` §4/§9/tooling table, `docs/product-spec.md` §14 (an editorial note, not a rewrite of the original Phase 1 assumption)                                                                                                   | —                | ✅     |
| Ran full suite + typecheck + lint clean across all workspaces                                                                                                                                                                                                       | —                | ✅     |

## EPIC-16 — Toolbar Redesign & Advanced Filtering

| Task                                                                                                                                                                                                                                                     | Story                              | Status |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------ |
| Rewrote `ExceptionBreakdown.tsx`: added an "All" pill, pills are real `<button>`s with `aria-pressed`, wired to the same `reason` URL filter as everything else                                                                                          | US-16.1                            | ✅     |
| New `FilterMenu.tsx` (icon + popover wrapping the reason select), `SortMenu.tsx` (icon + popover with sort field/order radios), `ExportMenu.tsx` (icon + popover with 3 format links)                                                                    | US-16.2, US-16.3                   | ✅     |
| New `usePopover.ts`: shared open/close + outside-click/Escape dismissal used by all three menus and the date range picker                                                                                                                                | —                                  | ✅     |
| New `DateRangePicker.tsx`: Kibana-style quick-select presets (Today, 7/30/90 days, 6 months/1 year) resolved against real wall-clock time, plus an absolute start/end range and a Refresh button                                                         | US-16.4                            | ✅     |
| New `Toolbar.tsx` composing the date range picker (left) and filter/sort/export icons (right); removed `FilterToolbar.tsx` and the single-format `ExportButton.tsx`                                                                                      | US-16.2, US-16.3, US-16.4          | ✅     |
| Backend: `exceptionsQuery.ts` export schema gained `format` (csv/xlsx/pdf, default csv) and `sortBy`/`sortOrder`; `reconciliationService.ts`'s sort logic extracted and reused by both list and export                                                   | US-16.3                            | ✅     |
| New `exceptionsExportRows.ts` (shared column/row shape), `exceptionsXlsx.ts` (ExcelJS workbook), `exceptionsPdf.ts` (hand-drawn PDFKit table) — `exceptionsCsv.ts` refactored onto the same shared rows                                                  | US-16.3                            | ✅     |
| `reconciliationController.ts`'s export handler branches on `format`, setting the correct content type/filename per format                                                                                                                                | US-16.3                            | ✅     |
| Added `exceljs`, `pdfkit` (+ `@types/pdfkit`) to `apps/api`                                                                                                                                                                                              | —                                  | ✅     |
| New/updated tests: `ExceptionBreakdown.test.tsx`, `FilterMenu.test.tsx`, `SortMenu.test.tsx`, `DateRangePicker.test.tsx`, `ExportMenu.test.tsx` (replacing `ExportButton.test.tsx`); `Dashboard.test.tsx` updated for the new popover-based interactions | US-16.1, US-16.2, US-16.3, US-16.4 | ✅     |
| `reconciliation.test.ts`: new export-format tests (xlsx zip signature, pdf signature, unsupported-format 400, sort order honored in export row order)                                                                                                    | US-16.3                            | ✅     |
| Manually verified against the live dev servers with a real Playwright-driven browser: pill filtering, filter/sort/export popovers, date range presets and absolute range, all screenshotted and reviewed                                                 | —                                  | ✅     |
| Ran full suite + typecheck + lint clean across all workspaces                                                                                                                                                                                            | —                                  | ✅     |
