# 2026-09-07 — Phase 4: Backend API

**Phases/epics touched:** Phase 4 (Backend API).
**Shipped:** see `CHANGELOG.md` "[Phase 4] - 2026-09-07 - Backend API".

## Decisions & why

- Layering follows `docs/standards/backend-standards.md` exactly: `route → controller → service
→ repository`. Controllers only parse (Zod), call one service function, and shape the
  response — no filtering/sorting/pagination logic in a controller.
- `csvReconciliationRepository` reads and reconciles the CSVs **once per process**, caches the
  result in a module-level `Map`, keyed by merchant (`docs/architecture.md` §9: "loaded once at
  process start" is an explicitly allowed option, not just at-request-time). A production
  version swaps this for a database-backed repository behind the same function signature.
- **Exception `id` = `transactionId`.** The engine's key guarantee (at most one exception per
  `merchantId + transactionId`) makes this safe without inventing a separate identifier. Flagged
  as a decision worth defending in review — a reviewer could reasonably ask "what if that
  invariant changes later," and the honest answer is the API would need a real id at that point.
- `/exceptions/export` is registered before `/exceptions/:id` in the router — otherwise Express
  would match the literal path segment `export` as `:id`. Order-dependent routing like this is
  exactly the kind of thing that's obvious once written and invisible once it works, so it's
  called out with a comment at the route definition, not just here.
- The explanation stub (`POST /exceptions/:id/explanation`) returns real, deterministic,
  calm-language text per exception reason — not a bare `501`/`not_implemented` placeholder. This
  stays a legitimate Phase 4 stub (MASTER_PROMPT explicitly allows one) rather than Phase 8 work
  pulled forward: no provider interface, no prompt design, just a lookup table. It exists so the
  frontend has a stable response contract to build against now.
- Integration tests run against the **real M-104 dataset** in `data/`, not synthetic fixtures —
  consistent with Phase 3's approach and with README's framing of M-104 as "the sample
  merchant," not an implementation detail. Flagged as a decision worth defending: a reviewer
  might prefer tests isolated from the shipped dataset via fixture injection, trading realism for
  independence from data changes. Chose realism here since the dataset is fixed and versioned
  with the repo, not expected to change.
- Cross-merchant isolation is tested with a **real** exception (`T1031`, a genuine
  `DUPLICATE_LEDGER` for M-106) requested as M-104, not just a nonexistent ID — this is what
  actually proves the merchant scope is enforced, versus a merely-absent-ID test which would
  pass even with a broken scope check.

## Direction changes / pivots

- Found and fixed a latent bug from Phase 2/3: `packages/shared`'s build was emitting ESM
  (inherited `module: ESNext` from `tsconfig.base.json`) with no consumer to catch it, since
  nothing had imported the package at runtime before Phase 4. `apps/api` (CommonJS, via Jest and
  its own `tsc` config) was the first real cross-package import and immediately failed with
  `SyntaxError: Unexpected token 'export'`. Fixed by overriding `module: CommonJS` in
  `packages/shared/tsconfig.json`, matching the override `apps/api` already had in its own
  config. Not a regression from this session's work — a gap Phase 2/3 had no way to catch
  without importing the package.

## Deferred / explicitly out of scope this session

- Real AI-generated explanations — Phase 8's `ExceptionExplanationProvider` (mock or real LLM).
  The stub built here is intentionally minimal and is expected to be replaced, not extended.

## Missed / noticed but not fixed

None currently known.

## Open questions for next session

None blocking. Phase 5 is ready to start.

## Resume point

- Next concrete action: Phase 5 — React Dashboard (`apps/web`): typed API client + TanStack
  Query hook per endpoint, status/summary/exception-breakdown/filter/table/export UI, URL
  search-param state for filter/sort/page, all 4 UX states.
- Minimum files to read first: `docs/product-spec.md` §3 (journeys) and §4 (info hierarchy +
  states) for what the dashboard needs to show; the response shapes recorded in this session
  (or re-run `npm run dev:api` and hit the endpoints directly) rather than re-deriving them from
  the controller code; `docs/standards/frontend-standards.md` for the TanStack Query/Redux/URL
  state boundary before writing any state management.
