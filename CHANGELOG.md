# Changelog

All notable changes to this project are recorded here, grouped by build phase (see
`docs/project-plan.md`) rather than semver, since this is a take-home assessment, not a
versioned package.

## [Unreleased] - 2026-09-09 - Remove Git Hooks

By direct user request: removed Husky and lint-staged entirely (`.husky/` directory, `prepare`
script, `lint-staged` config block, both dependencies uninstalled) and unset the repo-local
`core.hooksPath` git config, so no pre-commit or commit-msg hook runs automatically anymore.
`@commitlint/*` config/deps were left in place (not asked to remove; Conventional Commits remains
the house style for messages, just unenforced now). Updated `README.md` and `CLAUDE.md`'s
"Before you commit" section to describe the new manual `lint`/`typecheck`/`format:check` workflow,
and to note CI (`.github/workflows/ci.yml`, unaffected by this change) is now the only actual gate.

## [Unreleased] - 2026-09-09 - Overnight Engineering & Validation Run

By direct user request: a full gap-analysis-through-final-report pass to bring the repo to
submission-ready state. Entries below are added incrementally, one per step, as the run proceeds
(see `docs/overnight-baseline.md` for the plan and `OVERNIGHT_REPORT.md` for the final summary
once complete).

### Changed

- Demo login password changed from `m104@123` to `rapyd@2026`, by direct user request. Username
  (`m104@rapyd.com`) and `merchantId` (`M-104`) are unaffected; still overridable via
  `DEMO_LOGIN_USERNAME`/`DEMO_LOGIN_PASSWORD` env vars. Updated in `apps/api/src/auth/userStore.ts`,
  `README.md`, `docs/project-overview.md`, and the hardcoded `m104@123` fallback/expectation
  literals in `apps/api/src/routes/{auth,reconciliation}.test.ts`,
  `apps/web/src/auth/LoginPage.test.tsx`, and `apps/web/e2e/responsive.spec.ts` (by direct user
  request, superseding this repo's earlier standing rule against modifying test files without being
  asked — see CLAUDE.md's "Working with Claude in this repo" section, now removed).

### Fixed

- **`npm run build` was silently broken** — `vite build` failed with `"parseAmountToMinorUnits" is
not exported by ".../packages/shared/dist/index.js"`. `packages/shared` builds to CommonJS (for
  `apps/api`'s Node `require`); Rollup's production commonjs handling couldn't statically detect
  that one re-export, even though `tsc --noEmit` and `vite dev` both looked clean (neither reads
  the compiled `dist/` the way `vite build` does). Fixed by aliasing the `@rapyd-portal/shared`
  import specifier straight to its TypeScript source in `apps/web/vite.config.ts`'s
  `resolve.alias`, removing the CJS/ESM boundary entirely for the web build. Verified: full
  `npm run build` succeeds, `npm run typecheck` still clean, and a live browser check confirmed
  all three chart widgets still render with real data. See `docs/overnight-baseline.md` for the
  full root-cause writeup — this had apparently been broken since the chart widgets were added,
  undetected because no prior session in this repo's history had run an actual production build.

- **Exports were completely unreachable in the all-clear state.** Both places that render an
  export control (`Toolbar.tsx`, and the mobile-only row in `Dashboard.tsx`) were gated on
  `showTableSection`, which is `false` whenever there are zero exceptions — silently
  contradicting `docs/product-spec.md` §8's explicit "Export (for record-keeping even when
  everything matches)" and §11's "Export button remains accessible" commitments. Added a second,
  unconditional export row that shows exactly when the table section doesn't (any viewport),
  reusing the existing row styling. Found by a stale test assertion in `Dashboard.test.tsx` that
  turned out to be testing real, current product intent — fixed the app, not the test.
- **`FinancialImpactBarChart.tsx`'s `rows` memoization was defeated on every render** — `totals`
  was computed as `totalsQuery.data ?? []`, creating a new array reference whenever `data` was
  undefined, so the `useMemo` depending on it recomputed unconditionally. Moved the fallback
  inside the memo callback and keyed it on `totalsQuery.data` directly (caught by the one
  pre-existing `eslint` warning in the baseline; `npm run lint` is now 0 errors/0 warnings).

### Testing

- **`apps/web`: 16/16 suites, 76/76 tests green** (baseline: 8/15 suites failing, 18/60 tests).
  Root causes fixed, not papered over:
  - Added `internmap`/`d3-*` to Jest's `transformIgnorePatterns` (`jest.config.cjs`) — these ESM-
    only packages (pulled in by the chart widgets) were failing `App.test.tsx`/`Dashboard.test.tsx`
    at the module-parse stage, before any assertion ran, hiding real coverage in both suites.
  - `ExceptionDetailPanel.test.tsx`, `ExceptionCard.test.tsx`, `ExceptionsTable.test.tsx`,
    `Dashboard.test.tsx`: updated to mock `fetchTransactionById` (what `ExceptionDetailPanel`
    actually calls now, via `useReconciliationTransaction`) instead of the old, effectively dead
    `fetchExceptionById`/`useReconciliationException`; and rewrote every assertion that expected
    the old Details/Settlement-vs-Ledger/AI-Explain **tabs**, which don't exist anymore (the panel
    is a tab-free, always-visible two-column layout per its own docstring) — asserting on the
    now-always-visible "Side-by-side comparison" content instead of `role="tab"`/`"tablist"`.
    Added two new `ExceptionDetailPanel` cases (matched-transaction confirmation, load-failure
    retry) that weren't covered before.
  - New `Toolbar.test.tsx`: "Expand all"/"Collapse all" moved from `ExceptionsTable.tsx` to
    `Toolbar.tsx` in an earlier, unlogged session, leaving the feature completely untested (the
    old test asserted on it via a component that no longer renders those buttons). Added a real
    test against `Toolbar` itself.
  - `uiSlice.test.ts`, `useExceptionsFilters.test.tsx`: updated for the `pendingDraft` field and
    the `pageSize: 20 → 10` default change; added a case for the "reopening the chat starts a
    fresh conversation" reducer behavior from earlier this week, which had no test at all.
  - `Dashboard.test.tsx`: fixed copy drift ("5 of 14 transactions need attention" →
    "5 transactions need your review", "all 9 transactions reconciled" → "...are reconciled"),
    widened a `getByText` to `getAllByText` now that the same reason label legitimately appears
    in more than one place (table + the new chart legend), and removed an assertion on the "All"
    breakdown-pill button, which `Dashboard.tsx` currently hides by design (superseded by the
    exceptions-by-reason chart) in favor of `Toolbar`'s `FilterMenu`.
  - `DateRangePicker.test.tsx`: the component was redesigned (in an earlier, unlogged session)
    from "apply immediately per action" to a staged pending-range model with one shared Apply
    button, committed only via the refresh icon (whose accessible name becomes "Apply selected
    date range" once something's pending) — rewrote the 3 affected tests to drive that actual
    two-step flow instead of the old immediate-apply one.
- **`apps/api`: 9/9 suites, 57/57 tests green** (baseline: 2/9 suites failing).
  - `reconciliation.test.ts`: fixed the stale `pageSize: 20` pagination assertion; bumped one
    test's timeout to 15s (5 sequential real HTTP round-trips through supertest, all rejected by
    auth middleware before touching CSV/reconciliation logic — flaky against Jest's 5s default
    under load, not a real performance regression).
  - `openapiDocument.ts`: added the 3 routes the router had registered but the spec didn't
    document (`GET /summary/currency-totals`, `GET /transactions`, `GET /transactions/{id}`,
    with new `transactionDtoSchema`/`currencyTotalsDtoSchema`), plus the `from`/`to` query params
    `GET /summary` already accepted but never documented.

### Documentation

- `docs/overnight-baseline.md`: baseline `typecheck`/`lint`/`test`/`build`/`test:e2e` results
  recorded before any further fixes, plus a catalogued list of every test failure found with its
  root cause and which later step owns fixing it.
- `docs/assignment-gap-analysis.md`: traceability matrix against the assessment brief, covering
  every Part 1-4 requirement plus testing/accessibility/responsive/export, with a priority ranking
  for what to fix first.

## [Unreleased] - 2026-09-08 - Bug Fixes, Animation Consistency, Collapsible Nav & Regression Pass

By direct user request, on top of EPIC-17 below.

### Fixed

- **Search bar focus ring rendered as a square instead of following the pill shape.**
  `GlobalSearchBar.module.css`'s `.form:focus-within` already drew a correctly-rounded box-shadow
  ring, but the `<input>` itself still showed its own native (square) focus outline on top of it.
  Fixed with `.input:focus { outline: none; }`, and added a matching `:focus-visible` ring to the
  two circular send buttons (`GlobalSearchBar`'s and `SearchChatPanel`'s composer) that had none
  at all.
- **Main content stayed capped at 1200px even with the chat panel closed**, reading as space
  reserved for a drawer that wasn't open. `Dashboard.module.css`'s `.page` no longer carries a
  `max-width` by default — it fills the full row — and `.pageCompact` (chat panel open) now caps
  at `70%` (previously `1200px` unconditionally, `none` when compact — backwards from what the
  70/30 split needs).
- **Two "Apply" buttons in `DateRangePicker`'s popover shared the same accessible name** (both the
  relative quick-select and absolute-range sections had a button literally labeled "Apply"), which
  broke `DateRangePicker.test.tsx` once a second `getByRole('button', { name: /apply/i })` context
  existed in the same popover and is a real accessibility smell independent of that failure
  (identical announcements for two different actions). Disambiguated with
  `aria-label="Apply relative range"` / `"Apply absolute range"` (visible text unchanged).
- **`SearchChatPanel`'s auto-scroll effect called `Element.scrollTo`, unguarded** — not
  implemented in jsdom, so every test that mounted `Dashboard` (which always renders the chat
  panel now, open or not) threw and failed for a reason unrelated to what each test actually
  checked. Guarded with a `typeof body.scrollTo === 'function'` check; behavior in real browsers
  is unchanged.

### Changed

- **Motion consistency**: `tokens.css`'s three transition tokens (`--transition-fast/base/slow`)
  now share one `--ease-in-out` curve (`cubic-bezier(0.4, 0, 0.2, 1)`, Material's "standard"
  easing) instead of `--transition-slow` alone using a different custom ease-out curve. Since
  every opening/closing interaction in the app already composed its animation from these tokens
  (drawer/chat-panel open-close, row expand/collapse, popover menus, sidebar collapse, fade/slide
  keyframes) rather than hardcoding its own timing function, this one token change made all of
  them consistent — audited the full `apps/web` CSS for stray hardcoded easings first to confirm
  nothing bypassed the tokens (the only non-token easings found were `linear` on two continuous
  loops — the skeleton shimmer and the AI-thinking dots — which correctly stay `linear`/constant
  rather than ease-in-out).
- **Collapsible left navigation** (`AppShell.tsx`/`.module.css`, new `layout/NavIcon.tsx`): a
  toggle button (chevron, rotates 180° on state change) at the top of the sidebar switches between
  the full `208px` width (icon + label per item) and a slim `64px` icons-only rail
  (`--sidebar-width-collapsed`), both driven by one shared per-item line icon set. Collapse state
  lives in `uiSlice.sidebarCollapsed` (not local component state) because `AppShell` itself
  remounts on every route change (`App.tsx` wraps each `<Route>` element in its own `<AppShell>`),
  so a `useState` there would forget the preference the moment a merchant clicked to a different
  page. The sidebar width, brand text, and every nav label transition together on
  `--transition-slow` so the collapse reads as one motion, not the rail snapping while the labels
  disappear separately.
- `routes.ts`'s `NavItem` gained an `icon: NavIconName` field (one of 8 fixed keys); every nav
  item — including the hardcoded "Reconciliation" entry in `AppShell.tsx` — now specifies one.

### Regression testing

- Ran the full existing test suite (last run before this pass: EPIC-16's 58 `apps/web` / 57
  `apps/api`) and found 6 failing `apps/web` suites, all from source changes made in earlier
  sessions of this same work that were never reconciled against tests (by explicit prior
  instruction — tests were deliberately left alone until this pass's regression request):
  - `uiSlice.test.ts`: fully rewritten for the current slice shape (`expandedTransactionIds`,
    `search.{query,history,drawerOpen}`, `sidebarCollapsed`) — the old file still tested the
    removed `selectedExceptionId`/`exceptionDrawerOpened` API.
  - `ExceptionDrawer.test.tsx` deleted (the component it tested no longer exists — see EPIC-17)
    and replaced by a new `ExceptionDetailPanel.test.tsx` porting its actual coverage (tabs,
    duplicate-entries, AI-explain fetch-on-open, fallback-badge, network-error handling) onto the
    component that now renders that content inline instead of in a dialog.
  - `ExceptionsTable.test.tsx`: rewritten for the current `ExceptionsTableProps` (no more
    `filters`/`onViewDetail`) and the inline expand/collapse + "Expand all"/"Collapse all"
    behavior, replacing the old single "opens via View details" case.
  - `Dashboard.test.tsx`: one stale "opens the exception detail drawer" case rewritten as
    "expands a row inline"; two unrelated failures (`getByLabelText(/reason/i)` ambiguously
    matching the new global search bar's visually-hidden label, which also contains the word
    "reason") fixed by anchoring the query (`/^reason$/i`).
  - `App.test.tsx` and the rest of `Dashboard.test.tsx` were failing only as a side effect of the
    `scrollTo` bug above (both mount `Dashboard`/`AppShell`), not from any test logic of their
    own — no changes needed there beyond that one source fix.
  - Tests that share one real Redux store across a file (`ExceptionsTable.test.tsx`,
    `Dashboard.test.tsx` — see `renderWithProviders`'s docstring) now reset
    `expandedTransactionIds`/`search` state in `beforeEach`, since the inline-expand feature can
    otherwise leak an expanded row from one test into the next.
- Final state: **13 `apps/web` suites / 65 tests**, **9 `apps/api` suites / 57 tests**, all green.
  `tsc --noEmit` and `eslint` clean on both workspaces with zero errors or warnings.

## [EPIC-17] - 2026-09-08 - Global Search, Inline Exception Detail & Claude AI Integration

Spans several same-day sessions: URL/placeholder routing, the Kibana-style date picker's interval
control removal, global search + inline exception detail, the search bar's reposition to the page
header, and the Claude-backed AI chat/explain features — bundled into one entry since none of it
had a changelog entry yet and it forms one coherent arc from EPIC-16's toolbar work to today's
regression pass.

### Added

- **URL restructuring & placeholder pages**: the dashboard now lives at
  `/reconciliation/:merchantId` (e.g. `/reconciliation/M-104?sortBy=reason`), shareable/
  bookmarkable, with the `:merchantId` segment cosmetic-only — always resolved server-side from
  the session (`docs/architecture.md` §4); `ReconciliationRoute.tsx` redirects to the session's
  real merchant path if the URL segment doesn't match, preserving the query string. Every other
  sidebar item now routes to a real page rendering a shared `ComingSoon` placeholder
  (`common/ComingSoon.tsx`) instead of being inert non-interactive text.
- **Global search** (`layout/GlobalSearchBar.tsx`): a chat-input-styled search bar (submit on
  Enter/click, not live-as-you-type), backed by a new `GET /exceptions/search?q=` endpoint
  (`reconciliationService.ts`'s `searchExceptions`, `validation/exceptionsQuery.ts`) that matches
  transaction ID/reason/currency/amount case-insensitively across the merchant's _entire_
  exception set (ignoring pagination/filters), capped at 50 results. Matches are highlighted
  in-place (`dashboard/Highlight.tsx`, real `<mark>`) in both the table and the results.
- **Inline expandable exception detail**, replacing the modal `ExceptionDrawer`: each table row
  gets its own expand/collapse toggle (`ExceptionsTable.tsx`, `uiSlice.expandedTransactionIds`,
  independent per row, multiple open at once) plus "Expand all"/"Collapse all" controls. The
  drawer's old tabbed content (Details/Settlement vs. Ledger/AI Explain) moved to
  `ExceptionDetailPanel.tsx`, rendered inline with no dialog chrome and, deliberately, no focus
  trap (a merchant tabbing through a table row should reach the next row, not get trapped).
- **Search chat with Claude-generated summaries**: submitting a search opens `SearchChatPanel.tsx`
  in a 70/30 split beside the table (`Dashboard.module.css`'s `.splitLayout`), a real chat
  transcript (`uiSlice.search.history`) rather than a single-result view — each turn shows the
  merchant's query, a plain-language summary of the matches, and the matching transaction cards
  underneath, with a composer for follow-up questions. Backed by a new
  `POST /exceptions/search/explain` endpoint (`searchExplanationService.ts`,
  `searchExplanationProvider.ts`) that re-runs the search server-side (never trusts a
  client-supplied match list) and asks Claude Haiku 4.5 to narrate the result — grounded only in
  deterministic facts (aggregate counts/financial impact computed in code, plus a bounded 8-match
  sample), with the same fallback guarantee as the existing per-exception explanation feature
  (banned-language + length validation, deterministic template text if the provider is
  unavailable or its output looks unusable).
- **Natural-language "intent" fallback**: when a query matches nothing literally, the search-
  explain endpoint switches to `mode: 'intent'` — instead of reporting "0 results," it hands
  Claude the merchant's _entire_ exception set and asks it to interpret a vague question (e.g.
  "why isn't my money showing up?") against those already-decided facts, or say plainly that
  nothing seems relevant. The literal match count (always 0 in this mode) and the pool size Claude
  reasoned over are kept separate in the response so the frontend never misreports one as the
  other.
- **Real Claude API wiring** (`apps/api/src/services/claudeClient.ts`, `claudeExplanationProvider.ts`,
  `claudeSearchExplanationProvider.ts`): both AI features now call the real Claude Messages API
  (`claude-haiku-4-5-20251001` by default, `CLAUDE_API_KEY`/`CLAUDE_MODEL` env vars,
  `.env.example` documents both with a placeholder key) when a key is configured. With no key —
  the default for this take-home — the per-exception "AI Explain" tab keeps using the existing
  `MockExplanationProvider` (so `generatedBy: 'mock'` stays a reliable, offline-testable outcome
  rather than depending on network access during a test run) and the search chat falls back to its
  deterministic template; neither path ever surfaces a provider failure to the merchant.
- Search bar repositioned from the top-level app chrome into the reconciliation page's own header,
  next to the "Settlement Reconciliation" title — it only ever searches reconciliation data, so it
  no longer implies it's a portal-wide search.
- Removed the Kibana-style date range picker's auto-refresh interval control (button, popover
  menu, state, polling effect, and CSS) by direct user request — a manual Refresh button remains.

### Changed

- `uiSlice.ts`'s `search` state generalized from a single `{query, drawerOpen}` pair to
  `{query, history: string[], drawerOpen}` to support chat history; `expandedTransactionIds`/
  `search` replaced the earlier single `selectedExceptionId`.
- `openapiDocument.ts` gained `/exceptions/search` and `/exceptions/search/explain` entries,
  keeping `openapiDocument.test.ts`'s route/doc parity check accurate.

### Verified

- Live-verified end to end via Playwright against the real dev servers (not just Jest/RTL):
  independent multi-row expand/collapse, "Expand all"/"Collapse all", search filtering + table
  highlighting, the 70/30 split opening/closing at exactly a 0.30 width ratio, a follow-up chat
  question rendering as a second transcript turn, clicking a chat result collapsing the panel and
  scrolling to the matching row, and the natural-language intent fallback correctly reporting "no
  exceptions matched" for a query with zero literal keyword matches.

## [EPIC-16] - 2026-09-08 - Toolbar Redesign & Advanced Filtering

### Added

- `apps/web/src/dashboard/ExceptionBreakdown.tsx` rewritten: every pill (including a new "All"
  pill showing the total) is a real `<button>` with `aria-pressed`, wired to the same `reason`
  URL filter as the rest of the page; the active pill takes a brand-colored state.
- `apps/web/src/dashboard/FilterMenu.tsx`, `SortMenu.tsx`, `ExportMenu.tsx`: icon-button popovers
  for the toolbar's Filter, Sort, and Export controls — real functionality behind each icon
  instead of decoration. `usePopover.ts` is the shared open/close + outside-click/Escape
  dismissal behind all three (and the date range picker).
- `apps/web/src/dashboard/DateRangePicker.tsx`: a Kibana-style time range control — relative
  quick-select presets (Today, Last 7/30/90 days, Last 6 months/1 year, resolved against real
  wall-clock time) plus an absolute start/end range, and a separate Refresh button that re-fetches
  the summary and exceptions queries.
- `apps/web/src/dashboard/Toolbar.tsx`: composes the date range picker (left) with the
  filter/sort/export icons (right), replacing `FilterToolbar.tsx` and the single-format
  `ExportButton.tsx` (both removed).
- Excel and PDF export: `apps/api/src/serializers/exceptionsXlsx.ts` (via `exceljs`) and
  `exceptionsPdf.ts` (a hand-drawn table via `pdfkit`, since pdfkit has no table plugin), both
  built from a new shared `exceptionsExportRows.ts` that `exceptionsCsv.ts` was refactored onto.
  `GET /api/reconciliation/exceptions/export` now takes `?format=csv|xlsx|pdf` (default `csv`)
  and honors the same `sortBy`/`sortOrder` as the on-screen table, which it never did before.

### Changed

- `reconciliationService.ts`'s sort logic extracted into one `sortExceptions` helper, reused by
  both `listExceptions` and the export path (previously export was unsorted).
- `apps/api/src/validation/exceptionsQuery.ts`'s export schema gained `format`, `sortBy`, and
  `sortOrder`.

### Verified

- 57 `apps/api` tests (+4 from EPIC-15's numbers: xlsx/pdf export, unsupported-format rejection,
  export sort-order), 58 `apps/web` tests (+13: new component tests for the pills, three menus,
  and the date range picker, plus updated `Dashboard.test.tsx` interactions), 28
  `packages/shared` tests — 143 total, all green. Typecheck/lint/build clean.
- Live-verified with a real Playwright-driven Chromium browser against both running dev servers:
  pill filtering (table narrows to 1 row, pill turns purple), Filter/Sort/Export popovers open
  and apply correctly (sort actually re-orders the table, export links carry the current
  reason/sort/format), and the date range picker's "Last 7 days" preset resolves to the correct
  concrete dates and re-filters the table — all screenshots reviewed. Also downloaded real
  `.xlsx` (valid zip signature) and `.pdf` (valid PDF signature) files directly via curl against
  the live API.
- Caught and fixed one real visual bug this way (not just in code review): the date range panel
  initially opened off-screen under the sidebar because it inherited the right-side icon menus'
  anchoring; fixed with a `panelLeft` modifier once seen in a live browser, not just Jest/RTL
  (which doesn't render real viewport geometry). See
  `docs/sessions/2026-09-08-epic16-toolbar-redesign.md`.

## [Unreleased] - 2026-09-08 - Demo Login Credentials Updated

### Changed

- Default demo login credentials changed from `M-104` / `ChangeMe123!` to `m104@rapyd.com` /
  `m104@123`, by direct user request. `merchantId` itself (`M-104`) is unaffected — this is only
  the username/password pair used to authenticate, still overridable via `DEMO_LOGIN_USERNAME`/
  `DEMO_LOGIN_PASSWORD` env vars. `LoginPage.tsx`'s field label changed from "Merchant ID" to
  "Email" (`type="email"`) to match the new username's shape.

## [EPIC-15] - 2026-09-08 - Dashboard Authentication

### Added

- `apps/api/src/auth/userStore.ts`: one demo user (bcrypt-hashed password, `DEMO_LOGIN_USERNAME`/
  `DEMO_LOGIN_PASSWORD` env overrides) and `apps/api/src/auth/session.ts`: stateless signed-JWT
  session helpers (`AUTH_JWT_SECRET`, 8h expiry).
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
  (`controllers/authController.ts`, `routes/auth.ts`) — login sets an httpOnly, `sameSite: lax`
  session cookie; logout clears it; session-check lets the frontend know if it's logged in
  without hitting a reconciliation endpoint.
- `apps/api/src/middleware/merchantContext.ts` rewritten: reads and verifies the session cookie,
  sets `req.merchantId` from its payload, or rejects with `401 UNAUTHENTICATED` — replacing the
  Phase 4 hardcoded `merchantId = 'M-104'` mock. The isolation guarantee itself (never trust a
  client-supplied merchant ID) is unchanged; only how the trusted value is established changed.
- `cookie-parser` mounted in `app.ts`; `cors` reconfigured with `credentials: true` and an
  explicit `WEB_ORIGIN` (a wildcard origin can't be paired with credentialed requests).
- `apps/web/src/api/auth.ts`, `hooks/useAuthSession.ts`, `auth/RequireAuth.tsx`,
  `auth/LoginPage.tsx` (+ CSS module): a login page, session-gated routing (`App.tsx`'s first
  real use of `<Routes>`, previously URL-search-params-only), and a "Log out" button in
  `AppShell` that clears the TanStack Query cache before navigating away.
- `apiFetch` now sends `credentials: 'include'` so the session cookie survives a cross-origin
  deployment, not just the Vite dev proxy's same-origin case.

### Changed

- `apps/api/src/routes/reconciliation.test.ts` (16 tests): now logs in via a `supertest.agent`
  once and reuses the session cookie, since every `/api/reconciliation/*` request genuinely
  requires one now. Added a new `unauthenticated access` test covering all 5 endpoints with zero
  session.
- `docs/architecture.md` §4 (merchant isolation), §9 (assumptions), and the tooling table;
  `docs/product-spec.md` §14 (an editorial note appended, the original Phase 1 assumption left
  unedited); `README.md` (How to run, Sample merchant, API endpoints, Assumptions, Production
  improvements).

### Verified

- 53 `apps/api` tests, 45 `apps/web` tests (both +8 from EPIC-14's numbers), 28
  `packages/shared` tests — 126 total, all green. Typecheck/lint/build clean.
- Live-verified with a real Playwright-driven Chromium browser against both running dev servers:
  logged-out redirect to `/login`, wrong-password inline error, successful login lands on the
  real dashboard, session survives a full page reload, logout redirects to `/login`, and the
  dashboard is unreachable again afterward — all 6 checks passed; screenshots reviewed for visual
  correctness against the approved design.

## [EPIC-14] - 2026-09-08 - API Documentation & Access Control

### Added

- `apps/api/src/docs/openapiDocument.ts`: hand-authored OpenAPI 3.0 spec covering all 5
  reconciliation endpoints, mirroring the actual serializer and error response shapes.
- `apps/api/src/middleware/basicAuth.ts`: `requireBasicAuth` middleware (constant-time credential
  comparison, `WWW-Authenticate` challenge on failure) gating the new `GET /api/docs/` Swagger UI
  route only — never the reconciliation endpoints themselves.
- Mounted Swagger UI at `GET /api/docs/` in `apps/api/src/app.ts`, credentials from
  `SWAGGER_DOCS_USER`/`SWAGGER_DOCS_PASSWORD` env vars (defaulted to `admin`/`admin123` for local
  dev).
- `openapiDocument.test.ts`: derives the actual route list from the Express router's own `stack`
  and asserts it matches the spec's documented paths exactly, so the two can't silently drift.
- `basicAuth.test.ts` and new `app.test.ts` cases: no-credentials/wrong-credentials/malformed-
  header/correct-credentials, both as an isolated middleware unit and as a mounted integration
  test. 45 `apps/api` tests total (was 36).
- Manually verified against a running dev server: 401 → 401 → 200 with real Swagger UI HTML, and
  confirmed `/api/reconciliation/*` and `/api/health` are unaffected.
- `swagger-ui-express` + `@types/swagger-ui-express` added to `apps/api`.
- `README.md`, `docs/architecture.md`: documented the new route, default credentials, and env var
  overrides.

## [Unreleased]

### Added — Session-log memory system

- `docs/project-overview.md`: a stable, fast-orientation entry point (reading order, a table of
  which doc answers which question so nothing gets duplicated, current state, verified M-104
  ground-truth figures, known open threads).
- `docs/sessions/`: a per-session log capturing decisions, direction changes, deferrals, and
  gaps — the reasoning CHANGELOG/project-plan don't carry. Backfilled entries for Phase 1,
  Phase 2, and EPIC-EX from this CHANGELOG; going forward, a session ends with an entry here.
- `CLAUDE.md` and `README.md` updated to point to both, and `CLAUDE.md` now asks each session to
  add a session-log entry before ending.

## [Unreleased] - 2026-09-08 - Backlog: API Docs & Authentication Planning

### Added

- `docs/backlog/epics.md`, `user-stories.md`, `tasks.md`: two new epics, EPIC-14 (API
  Documentation & Access Control — Swagger/OpenAPI UI gated behind HTTP Basic Auth) and EPIC-15
  (Dashboard Authentication — a simple login mechanism replacing the mocked merchant-context
  middleware), added by direct user request, outside MASTER_PROMPT's original 13-phase scope.
  Both are planning-only so far — no implementation yet.
- `docs/project-plan.md`: two new tracker rows for the same, following the precedent set by
  EPIC-EX (tracked as its own row/epic rather than folded into an already-"done" phase).

### Fixed

- `docs/backlog/epics.md`, `user-stories.md`, `tasks.md`: EPIC-08 through EPIC-13 had been left
  showing "Not Started" since Phase 7, even though all of those phases were actually completed
  (confirmed done in `docs/project-plan.md` since Phase 13). The backlog folder had silently
  stopped being updated after Phase 7 while the rest of the doc set kept moving — corrected all
  three files' statuses to match reality, and backfilled `tasks.md`'s task-level breakdown for
  EPIC-08–13 (previously just coarse "refine at phase start" placeholders) from the actual
  session logs and CHANGELOG entries for those phases.

## [Phase 13] - 2026-09-08 - Live Interview Preparation

### Added

- `docs/interview-prep/README.md`, `questions.md`, `do-not-claim.md`: 25 likely interview
  questions grounded strictly in this repository (MASTER_PROMPT's own 20-question focus list plus
  5 more specific to decisions this repo actually makes — Jest vs. Vitest, the money-parsing
  mechanism, the API boundary, and a full narration of the Phase 9 focus-trap bug), each with what
  the interviewer is testing, a scripted 1-2 minute answer, and likely follow-ups. A separate
  `do-not-claim.md` lists every place an honest answer should name a known gap rather than defend
  it as more than it is (scaling, mock auth, mobile audit, e2e coverage, unreviewed
  `CURRENCY_MISMATCH` copy, missing observability, the minimal CSV parser, the non-roving-tabindex
  tab pattern, no `inert`, undecided export scope, no data-freshness indicator).

## [Phase 12] - 2026-09-08 - Final Engineering Review

### Fixed

- `apps/web/src/hooks/useExceptionsFilters.ts`: the `reason` URL query parameter was cast to
  `ExceptionReason` without checking membership (unlike `sortBy`/`sortOrder`, which already
  validated against a known list). An invalid `reason` in the URL now falls back to "no filter"
  instead of being forwarded to the API and surfacing as a table-level error. Found during the
  Phase 12 "unvalidated query parameters" review pass.

### Reviewed, no change needed

- Full scored repository review across 12 dimensions (product judgment through maintainability)
  plus a targeted search for hardcoded reconciliation results, merchant data leakage, float money
  bugs, duplicate/currency-aggregation bugs, business logic misplacement, weak error states,
  inaccessible table rows, LLM hallucination risk, dead code, and inconsistent naming. No P0s
  found. See `docs/sessions/2026-09-08-phase12-final-review.md` for the full report.

## [Phase 11] - 2026-09-07 - README

### Changed

- `README.md` rewritten from its EPIC-EX-era "in progress" scoped version into the full
  submission README: problem, solution overview, screenshots note, tech stack, architecture,
  how to run/test, sample merchant, API endpoints, reconciliation rules, assumptions,
  accessibility, AI explanation design, trade-offs, production improvements (the exact list
  MASTER_PROMPT specifies, honestly marked as not implemented), and the AI-tool usage
  disclosure. Every substantive section links out to the detailed doc that owns that topic
  (`docs/architecture.md`, `docs/ai-design.md`, `docs/accessibility.md`,
  `docs/stakeholder-memo.md`) rather than duplicating it, consistent with this repo's existing
  doc-map convention -- kept concise enough to read in about five minutes.

## [Phase 10] - 2026-09-07 - Stakeholder Memo

### Added

- `docs/stakeholder-memo.md`: a ~1-page, non-technical memo for the Head of Merchant Support --
  what merchants can now do, what still genuinely requires a human (the portal shows evidence,
  it doesn't resolve discrepancies itself), the one trade-off we made and what we'd add next,
  the primary support-contact-reduction metric and how we'll measure it, and a plain-language
  explanation of how the AI-generated explanations are grounded and safeguarded, plus a short
  AI-assistance disclosure. Deliberately written with zero engineering jargon (no framework
  names, no architecture terms) -- a register shift from every other doc in this repo, all of
  which are written for the next engineer, not an operations leader.

## [Phase 9] - 2026-09-07 - Accessibility Review

### Fixed

- **Focus trap could escape the drawer entirely.** `useFocusTrap.ts`'s "last focusable element"
  calculation included hidden tab panels (`querySelectorAll` matches hidden elements; a real Tab
  keypress can never land on one), so the wrap-back-to-first condition could never fire once a
  merchant tabbed past the last _reachable_ element -- focus escaped to whatever came after the
  drawer in the page instead of cycling back to Close. Found by driving the real app with
  Playwright and logging every Tab stop, not by reading the code (existing tests only checked
  single focus transitions, never a full Tab cycle). Fixed via a `hidden`-attribute-based
  `isReachable` filter (deliberately not layout-based, since jsdom doesn't compute layout).
  Verified the new regression test actually fails without the fix before confirming it passes
  with it.
- **Two color tokens inherited from the approved design prototype failed WCAG AA contrast.**
  `--color-text-muted` (`#9CA3AF`, 2.54:1 against white -- used for every card/table/field label
  in the app) and `--color-border-strong` (`#D1D5DB`, 1.47:1 -- form control borders) both fail
  their respective 4.5:1 / 3:1 minimums. Computed exact contrast ratios for every color pair in
  use (not estimated); every other pair already passes (4.83:1-16.91:1). Fixed as two single-line
  token changes in `tokens.css` -- `--color-text-muted` aliased to the already-passing
  `--color-text-secondary`, `--color-border-strong` darkened to the lightest shade that still
  clears 3:1 -- with no component file touched.

### Added

- Real `<h2>`/`<h3>` heading structure where the page previously had exactly one heading total
  (`<h1>`) despite `docs/product-spec.md` §12 committing to "h1 page title, h2 sections" --
  `ExceptionBreakdown`'s label, a new visually-hidden "Summary" heading, and the drawer's
  "Side-by-side comparison"/"Explanation" section labels are now real headings (same CSS, zero
  visual change).
- Decorative glyphs (✦, ●) in the drawer wrapped in `aria-hidden` spans so they aren't read aloud
  as "star"/"black circle" ahead of their labels.
- `AppShell`'s sidebar nav converted from a flat run of `<span>`s to a real `<ul>`/`<li>` list.
- A `<caption>` on the drawer's new comparison table, matching the pattern the main exceptions
  table already used.
- `docs/accessibility.md`: full review write-up against MASTER_PROMPT's checklist, including the
  computed contrast table and an interview-ready explanation of the three most important
  decisions.
- 1 new regression test (`ExceptionDrawer.test.tsx`) for the focus-trap fix (38 → 39 `apps/web`
  tests).

## [Phase 8] - 2026-09-07 - LLM Explanation Feature

### Added

- `apps/api/src/services/explanationProvider.ts`: `ExceptionExplanationProvider` interface,
  `ExplanationContext` (the strict structured facts a provider may see -- transaction id, reason,
  currency, settlement/ledger amount+date, difference, duplicate count, nothing else),
  `buildExplanationContext`, and `buildExplanationPrompt` (the fixed system intent + itemized
  facts a real LLM provider would send verbatim).
- `apps/api/src/services/mockExplanationProvider.ts`: `MockExplanationProvider`, a per-reason
  template generator grounded entirely in `ExplanationContext` -- every sentence traces back to a
  supplied fact, never to anything inferred. Stands in for a real LLM call behind the same
  interface, so swapping it later changes only which provider `explanationService.ts` holds.
- `apps/api/src/services/explanationService.ts`: `getExplanation()`, the orchestration layer that
  provides MASTER_PROMPT's required guarantee -- a merchant never sees an AI failure as a
  blocking experience. Two independent safety nets: a provider that throws falls back to
  deterministic text, and a provider that returns unusable output (too short, implausibly long,
  or containing banned speculative/alarming language -- "fraud", "stolen", "lost", "missing
  funds", "liability") also falls back, even though the call itself succeeded. Provider is
  dependency-injected (defaults to `MockExplanationProvider`), so the fallback logic is fully
  unit-testable independent of which provider is wired in.
- `apps/api/src/services/deterministicExplanation.ts` (renamed/repurposed from the Phase 4
  `explanationStub.ts`): `buildDeterministicExplanation()`, the guaranteed-safe fallback text,
  generated directly from the reconciliation rule (the `reason`), tagged `generatedBy: 'fallback'`
  so the frontend can tell it apart from a real provider response.
- `docs/ai-design.md`: prompt design, grounding, hallucination controls, failure UX,
  logging/observability, PII/data-handling, and the ship/no-ship recommendation MASTER_PROMPT
  Phase 8 asks for verbatim -- plus the AI-tooling-disclosure section it also requires.
- 19 new `apps/api` unit tests across the four new/changed service files (17 → 36).
- `apps/web`: `fetchExplanation` and `useExceptionExplanation` (built in the earlier Design
  Implementation session) now consume the real provider/fallback response; the "AI Explain" tab's
  badge reads `generatedBy` to show "Auto-generated — verify details" only for a real provider
  response, and a plain "Standard explanation" badge (no AI claim) when the deterministic fallback
  was used. 1 new drawer test proves the fallback case never claims AI involvement (37 → 38).

### Changed

- `POST /exceptions/:id/explanation` now returns `generatedBy: 'mock'` on the normal path
  (previously `'stub'`) -- updated the existing Phase 4 integration test accordingly. Response
  shape (`{ explanationText, generatedBy }`) is unchanged, so nothing on the frontend needed a
  contract change, only the badge-wording branch.

## [Design Implementation] - 2026-09-07 - Approved Visual Design Applied

Not a MASTER_PROMPT phase -- applying the CSS/animations/interactions from the approved Phase 1
design (`docs/design/Rapyd Settlement Reconciliation Final Design - Interactive Prototype.html`)
to the functional dashboard Phases 5-7 already built. Extracted design tokens (colors, type,
radii, shadows, motion) from the prototype's own computed styles rather than eyeballing it, then
restyled every existing component in place -- no functional regressions: all 33 pre-existing
`apps/web` tests still pass unmodified.

### Added

- `apps/web/src/styles/tokens.css`, `global.css`, `buttons.module.css`: the design-token layer
  (CSS custom properties) and shared primitives every component pulls from.
- `apps/web/src/layout/AppShell.tsx`: the sidebar/topbar portal chrome from the design. The other
  nav items (Home, Collect, Disburse, ...) render as plain non-interactive text, not links to
  nowhere -- nothing in `docs/product-spec.md` scopes those as real pages, and a link with no
  destination fails the keyboard/screen-reader navigation commitment as surely as a missing label
  would.
- CSS Modules per component (`*.module.css` next to each `.tsx`) -- confirmed this was already
  the intended approach (`identity-obj-proxy` + Jest's `moduleNameMapper` were already wired for
  it since Phase 2/EPIC-EX, just never used).
- Skeleton-shimmer loading states, drawer slide-in + backdrop fade, hover/focus transitions,
  sort-caret and tab-underline transitions -- all skipped under `prefers-reduced-motion: reduce`.
- `ExceptionDrawer` restructured into three tabs matching the design: **Details** (unchanged
  content: needs-review pill, settlement/ledger amounts, difference, duplicate entries,
  deterministic explanation + next step -- always visible on the default tab, never gated behind
  a click), **Settlement vs. Ledger** (new side-by-side comparison table), and **AI Explain**
  (new -- see below). The Close button stays first in DOM order for `useFocusTrap` regardless of
  the tabs; its position next to the title is CSS `order`, not a DOM reorder.
- **AI Explain tab wired to the real Phase 4 explanation endpoint** (`POST
/exceptions/:id/explanation`, `apps/api/src/services/explanationStub.ts`) via a new
  `fetchExplanation` API function and `useExceptionExplanation` hook -- fetched only when the tab
  is opened, not for every exception a merchant glances at. The badge reads its wording from the
  response's `generatedBy` field rather than hardcoding "AI-generated": today that's a
  deterministic stub, so the badge says "Auto-generated" rather than claiming AI involvement that
  isn't real yet. This is UI surface only -- Phase 8 still owns the actual
  `ExceptionExplanationProvider` design; this just gives it a home to render into, behind the same
  response contract, per the Phase 7 session log's resume note.
- `ExceptionsTable` reason pills now carry a `severity` ('amount' | 'structural') from
  `exceptionLabels.ts`, driving the amber-vs-gray pill distinction the design uses -- purely
  visual grouping, no reconciliation logic.
- 4 new `ExceptionDrawer` tests covering the tabs and the AI Explain fetch-on-open + error
  fallback behavior (33 → 37 `apps/web` tests).

### Changed

- `StatusBanner` gained a `matchedCount` prop and a subtitle line (design's two-line banner
  copy); the tested title strings are unchanged.
- `FilterToolbar`'s reason `<select>` and date `<input>`s are unchanged elements/ids/labels
  (existing tests query them directly) -- restyled only, plus the two date inputs now sit under
  one visible "Date range" label with individually visually-hidden "From"/"To" labels for screen
  readers.
- `apps/web/index.html` loads Inter from Google Fonts (system-ui fallback stack retained).

### Deferred / explicitly not done

- The design's help/notification icon buttons in the topbar and the "Download Receipt"/"Contact
  Support" drawer footer buttons were left out -- none has real functionality behind it yet
  (no receipt data, no support contact target defined anywhere in the docs), and a button that
  does nothing is the same accessibility smell as the inert nav links, just easier to miss.
- Full responsive/mobile audit is still open (flagged in Phase 5) -- this pass added a 2-column
  fallback to the summary-card grid at narrow widths as a side effect of the redesign, but that
  isn't a substitute for the audit.

## [Phase 7] - 2026-09-07 - Frontend Tests

### Added

- Audited the assessment brief's required exceptions-table coverage (render populated, filter,
  sort, pagination, loading, all-clear/empty, API error, retry, opens detail, export) against
  what Phases 5-6 already had. Filled the real gaps rather than writing a second parallel suite:
  - Exceptions-table-scoped loading state, shown independently of the page shell.
  - Exceptions-table-scoped error + **working retry** (asserts the table actually recovers after
    a successful retry, not just that the retry button exists).
  - Page-level retry strengthened the same way: asserts recovery, not just presence.
  - Reason filter test strengthened to prove the table's _rendered content_ changes (different
    mocked response per filter value), not just that the fetch function received the right args.
  - Sort-toggle direction logic (`Dashboard`'s asc↔desc toggle on repeat clicks, reset to
    ascending on a new column) — previously untested despite being real logic in `Dashboard.tsx`.
  - Pagination wired end-to-end (`Dashboard` → `updateFilters({ page })` → refetch).
  - Export link reflects the currently-applied filter.
  - `ExceptionsTable`'s `aria-sort` attribute asserted directly (previously only exercised
    indirectly through the sort-toggle test).
  - New `ExportButton.test.tsx`: URL construction in isolation (no filters vs. reason + date
    range).
- `apps/web` unit test count: 25 → 33. Full suite re-run 4 times consecutively with zero
  flakiness. No snapshot tests, no `data-testid`, no non-accessible queries anywhere in the
  suite (audited, not just assumed).
- Confirmed the existing Playwright e2e smoke spec (`apps/web/e2e/smoke.spec.ts`) still passes
  against the real dashboard — it happened to only assert the always-rendered page heading, so
  Phase 5/6 didn't silently break it.

## [Phase 6] - 2026-09-07 - Exception Detail UX

### Added

- `apps/web/src/dashboard/ExceptionDrawer.tsx`: the real accessible side drawer, replacing
  Phase 5's `ExceptionDetailPlaceholder`. Shows transaction ID, merchant-facing exception title,
  processor settlement, internal ledger, computed difference, both duplicate ledger entries for
  `DUPLICATE_LEDGER` (closing the gap flagged in the Phase 1 self-review — "Limited exception
  detail for duplicates"), the static factual explanation and next step from
  `exceptionLabels.ts`.
- `apps/web/src/dashboard/useFocusTrap.ts`: hand-rolled focus trap (no new dependency) — moves
  focus into the drawer on open, traps Tab/Shift+Tab cycling within it, restores focus to the
  triggering "View details" button on close.
- `apps/web/src/hooks/useReconciliationException.ts`: dedicated query hook for
  `GET /api/reconciliation/exceptions/:id` — previously unused by any UI since Phase 4. Fetches
  independently of the currently-loaded table page, so the drawer stays correct even if filters/
  pagination change while it's open.
- Escape closes the drawer; `role="dialog"` + `aria-modal="true"` + `aria-labelledby` give it an
  accessible title (`docs/product-spec.md` §12).
- Preserving the table's filters/pagination/scroll while the drawer is open required no special
  handling — `selectedExceptionId` lives in Redux, not the URL, so it was already structurally
  independent of the table's state.
- 6 new tests (`ExceptionDrawer.test.tsx`): title/content rendering, both duplicate entries
  shown, focus moves in on open, focus returns to trigger on close, closes on Escape. Existing
  `Dashboard.test.tsx`/`ExceptionsTable.test.tsx` fixtures consolidated into
  `apps/web/src/test/fixtures.ts` to remove duplication.
- Manually verified in a real browser (Playwright driver script): both `AMOUNT_MISMATCH` and
  `DUPLICATE_LEDGER` drawers, Escape-close-returns-focus, and Tab-cycle-wraps, all against the
  live API with zero console errors.

### Fixed

- A flaky focus-related test failure traced to cross-test state leakage: tests that opened the
  drawer without explicitly closing it caused RTL's unmount-time cleanup to interfere with the
  _next_ test's focus-trap behavior. Fixed by having every test close what it opens, not by
  papering over the symptom with a longer timeout.

## [Phase 5] - 2026-09-07 - React Dashboard

### Added

- `apps/web/src/api/`: typed fetch client (`client.ts`, throws a typed `ApiError` on non-2xx,
  never leaks the raw error to a component), `reconciliation.ts` (`fetchSummary`,
  `fetchExceptions`, `buildExportUrl`), and `types.ts` mirroring `apps/api`'s response DTOs by
  hand (per `docs/architecture.md` §5 — `apps/web` never imports `apps/api` code directly).
- `apps/web/src/hooks/`: `useReconciliationSummary`, `useReconciliationExceptions` (one
  TanStack Query hook per endpoint, full filters object in the query key), and
  `useExceptionsFilters` — filters/sort/page read from and written to URL search params via
  `react-router-dom`'s `useSearchParams`, omitting default values so links stay clean
  (`docs/product-spec.md` §7, success criterion 4).
- `apps/web/src/dashboard/`: `Dashboard` (composes all 4 UX states —
  loading/error/all-clear/populated, per `docs/product-spec.md` §8), `StatusBanner`,
  `SummaryCards` (financial impact grouped by currency, never summed), `ExceptionBreakdown`,
  `FilterToolbar`, `ExceptionsTable` (sortable `<th><button>` headers with `aria-sort`,
  keyboard-actionable row actions, server-side pagination), `ExportButton` (plain anchor,
  relies on the API's `Content-Disposition` header), `exceptionLabels.ts` (merchant-facing
  copy from `docs/product-spec.md` §9), `formatting.ts` (currency display formatting via
  string manipulation, never floats).
- `ExceptionDetailPlaceholder`: an intentionally minimal Phase 5 stub proving the row action is
  wired to real state (`uiSlice.selectedExceptionId`) — Phase 6 replaces it with the real
  accessible side drawer (focus trap, Escape, settlement/ledger detail).
- `BrowserRouter` added to `main.tsx` (used only for `useSearchParams` — no `<Routes>`, this
  stays a single-dashboard experience per `docs/product-spec.md` §7).
- 19 tests: `Dashboard` (all 4 states, row action, filter-triggers-refetch),
  `ExceptionsTable` (sort, pagination boundaries, keyboard-operable row action),
  `useExceptionsFilters` (URL round-trip, page-reset-on-filter-change, default-omission), plus
  the existing `App`/`uiSlice` tests updated for the real dashboard.
- Manually verified in a real browser (Playwright driver script, not just RTL) against the live
  API and real M-104 data: populated dashboard, reason-filter narrowing, and the row-action →
  detail-placeholder flow, with zero console errors. Screenshots and findings recorded in
  `docs/sessions/`.

### Fixed

- `useReconciliationExceptions` now takes an `enabled` flag; `Dashboard` gates it on
  `hasExceptions` so the exceptions query doesn't fire while the summary is still loading or
  once it's resolved to zero exceptions — caught by "Query data cannot be undefined" console
  noise in tests before the fix, not by manual QA.

## [Phase 4] - 2026-09-07 - Backend API

### Added

- `apps/api` layered per `docs/standards/backend-standards.md` (`route → controller → service →
repository/engine`): `repositories/csvReconciliationRepository.ts` (reads + reconciles the
  CSVs once per process, caches the result, keyed by merchant), `services/reconciliationService.ts`
  (filter/sort/paginate, merchant-scoped lookups), `controllers/reconciliationController.ts`
  (thin — parse, call service, shape response), `routes/reconciliation.ts`.
- 5 endpoints: `GET /summary`, `GET /exceptions` (paginated/filtered/sorted), `GET
/exceptions/:id`, `GET /exceptions/export` (CSV), `POST /exceptions/:id/explanation` (Phase 4
  stub — deterministic, calm-language text per exception reason; Phase 8 replaces this with a
  real `ExceptionExplanationProvider` behind the same fallback guarantee).
- Zod validation (`validation/exceptionsQuery.ts`) for `page`/`pageSize`/`reason`/`from`/`to`/
  `sortBy`/`sortOrder`, including a cross-field check that `from` isn't after `to`. Invalid input
  → `400` with a field-specific message; unknown exception ID (including a real exception that
  belongs to a different merchant) → `404`; unexpected errors → `500` via a catch-all error
  middleware, never leaking internals.
- Response DTOs (`serializers/reconciliationSerializers.ts`, `serializers/exceptionsCsv.ts`)
  convert minor units to decimal strings only at the response edge, per
  `docs/architecture.md` §8. The exception `id` is its `transactionId` — documented as a
  decision worth defending in review, since the reconciliation engine's key guarantee (at most
  one exception per `merchantId + transactionId`) is what makes that safe.
- 17 Supertest integration tests covering summary, pagination, filtering, sorting, validation
  errors, single-exception lookup, **cross-merchant isolation by ID** (a real `DUPLICATE_LEDGER`
  exception belonging to M-106 correctly 404s when requested as M-104), CSV export (including
  that a filter rejection doesn't fall through to exporting unfiltered data), and the
  explanation stub. Run against the real M-104 dataset, not synthetic fixtures.
- Manually verified all 5 endpoints against a running dev server — response shapes recorded in
  `docs/sessions/`.

### Fixed

- `packages/shared`'s build was emitting ESM (`export const ...`) with no consumer to catch it,
  since nothing previously imported the package at runtime. Overriding `module` to `CommonJS` in
  `packages/shared/tsconfig.json` (matching `apps/api`'s own override) fixed it — this was a
  latent bug from Phase 2/3, surfaced by Phase 4 being the first real cross-package import.

## [Phase 3] - 2026-09-07 - Reconciliation Engine

### Added

- `packages/shared`: `SettlementRecord`, `LedgerRecord`, `ReconciliationException`,
  `ReconciliationResult`, `ReconciliationSummary`, `ExceptionReason` types; CSV-string →
  integer-minor-units money parsing (`money.ts`); minimal CSV row parsing (`parsing.ts`); the
  deterministic reconciliation engine itself (`reconcile.ts`).
- Six exception rules with documented precedence — `DUPLICATE_LEDGER` checked first (so a
  double-posted ledger entry never also surfaces as a spurious `AMOUNT_MISMATCH`), then
  `MISSING_LEDGER`/`MISSING_SETTLEMENT`, then `CURRENCY_MISMATCH` (evaluated defensively; no
  M-104 row currently triggers it), then `AMOUNT_MISMATCH` (settlement net vs. ledger amount),
  then `DATE_MISMATCH`. At most one exception per `merchantId + transactionId` key.
- Per-merchant summary with financial impact grouped by currency — never summed across
  currencies (`docs/architecture.md` §8, `docs/product-spec.md` §15).
- Jest + ts-jest wired up for `packages/shared` (previously a no-op `test` script). 28 unit
  tests: one per exception rule, a precedence regression test (duplicate + differing amount
  doesn't also raise `AMOUNT_MISMATCH`), merchant isolation (including colliding
  `transactionId`s across two different merchants), money precision (float-drift regression,
  one-minor-unit difference detection), plus `money.ts`/`parsing.ts` unit coverage.
- Public API surface exported from `packages/shared/src/index.ts` (previously just a
  placeholder constant).
- Ran the engine against the real `data/settlement_export.csv` + `data/ledger_export.csv` for
  M-104: **14 checked, 9 matched, 5 exceptions** — T1006 `MISSING_LEDGER`, T1013
  `AMOUNT_MISMATCH`, T1008 `DUPLICATE_LEDGER`, T1054 `DATE_MISMATCH`, T1045
  `MISSING_SETTLEMENT`; financial impact AED 1,533.31 + USD 24.31. Matches the corrected Phase 1
  mockup figures exactly (see `docs/sessions/`).

### Housekeeping

- All workspaces (`npm run typecheck`, `npm run lint`, `npm run test`) verified clean after this
  phase.

### Added — Engineering Standards & Developer Experience (EPIC-EX)

- Redux Toolkit + `react-redux` in `apps/web`, scoped narrowly to non-shareable UI state
  (`uiSlice`: exception drawer selection, toast notifications). Server state stays in TanStack
  Query and shareable state stays in URL params — Redux does not duplicate either. See
  `docs/standards/frontend-standards.md` "State management boundaries."
- Migrated `apps/web` unit tests from Vitest to **Jest + Babel + React Testing Library**, after
  re-auditing `docs/assessment-brief.pdf` and finding it names Jest specifically (not "Jest or
  equivalent," unlike its Redux clause). Removed the Vitest config/deps; typecheck is unaffected
  since Babel only strips types (still fully checked by `tsc --noEmit`).
- Playwright e2e scaffold in `apps/web/e2e` with one smoke spec, ready for real per-journey
  specs once Phase 5/6 build the dashboard — verified passing end-to-end (Chromium installed,
  `npm run test:e2e` green).
- Husky + lint-staged pre-commit hook: lint-staged (ESLint --fix + Prettier on staged files) +
  full `typecheck` on every commit.
- Husky `commit-msg` hook + commitlint enforcing Conventional Commits.
- GitHub Actions CI (`.github/workflows/ci.yml`): lint, typecheck, unit tests, build, and e2e on
  every push/PR.
- `.github/pull_request_template.md`.
- `CLAUDE.md` (root) — project-wide non-negotiables and pointers, auto-loaded every session.
- `docs/standards/backend-standards.md` and `docs/standards/frontend-standards.md` — concrete,
  stack-specific coding standards (layering, merchant isolation, monetary precision, state
  boundaries, accessibility, testing conventions, naming).
- `docs/backlog/` (README, epics.md, user-stories.md, tasks.md) — Epic → User Story → Task
  tracking reflecting end-to-end domain-owner + full-stack ownership of this build.

### Housekeeping

- Renamed the provided data folder `client-portal-assessment-data/` → `data/` for a shorter,
  cleaner path. Contents (`README.txt`, `settlement_export.csv`, `ledger_export.csv`) are
  byte-identical to what was provided — only the containing folder name changed.
- Moved instruction/prompt files (`MASTER_PROMPT.md` and the two phase-kickoff prompts) into
  `docs/prompts/`, separating them from actual deliverables at the top level of `docs/`.
- Moved the assessment brief PDF and Rapyd dashboard reference screenshots into `docs/`
  (`docs/assessment-brief.pdf`, `docs/reference/rapyd-dashboard-screenshots/`).
- Removed duplicate files carried over from earlier exploration: a duplicate `MASTER_PROMPT.md`
  copy, a duplicate zip of the provided CSVs, and a fully-duplicate `client-portal-project/`
  folder — all verified byte-identical to their canonical copies before removal.
- Fixed two data-accuracy bugs in the Phase 1 HTML mockups (`docs/design/*.html`): hardcoded
  "Checked"/"Matched" stat tiles read 15/10 instead of the actual M-104 figures (14/9, derived
  from the provided CSVs), and the AED financial-impact chip omitted the missing-ledger
  exception's amount (148.65 AED → corrected to 1,533.31 AED).

## [Phase 2] - 2026-09-07 - Repository & Architecture

### Added

- npm workspaces monorepo: `apps/api` (Express), `apps/web` (React + Vite),
  `packages/shared` (framework-free — will hold the reconciliation engine in Phase 3).
- Shared TypeScript config (`tsconfig.base.json`, `strict` + `noUncheckedIndexedAccess`),
  ESLint (`@typescript-eslint`, React rules for `apps/web`), Prettier.
- `apps/api`: Express app factory (`createApp`) separated from the listener (`index.ts`) for
  testability; `attachMerchantContext` middleware stubbing the authenticated-merchant boundary
  (`merchantId = M-104`); Jest + Supertest smoke test against `/api/health`.
- `apps/web`: Vite + React 18 shell wired to TanStack Query; Vitest + React Testing Library
  smoke test; dev server proxies `/api` to the backend.
- `docs/architecture.md`: components, data flow, reconciliation boundary, merchant isolation
  strategy, API boundary, test strategy, error handling, monetary precision strategy,
  assumptions.
- Root scripts (`dev:api`, `dev:web`, `typecheck`, `lint`, `format`, `test`, `build`) fanned out
  across workspaces. Verified: install, typecheck, test, and build all pass clean.

## [Phase 1] - 2026-09-07 - Product Thinking & UX

### Added

- `docs/product-spec.md`: problem statement, primary user, 3 core user journeys, goals/
  non-goals, information architecture, 4 UX states (loading/all-clear/error/populated),
  merchant-facing exception language for all 5 exception types, desktop wireframe, responsive
  strategy, WCAG 2.1 AA accessibility commitment, definition of done with a measurable business
  metric, assumptions, risks, product trade-off, success criteria, and a self-review from the
  perspective of Rapyd's Head of Merchant Support.
- `docs/design/*.html`: two UX direction mockups grounded in the actual M-104 exceptions
  (T1006, T1013, T1054, T1008, T1045) derived from `data/`.
- `docs/to_submit/Part 1 - UX Product Doc.pdf`: the submission-ready version of the UX/product
  framing deliverable.
