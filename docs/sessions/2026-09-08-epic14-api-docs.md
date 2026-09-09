# 2026-09-08 — EPIC-14: API Documentation & Access Control

**Phases/epics touched:** EPIC-14 (implementation). EPIC-15 planned next in this same session.
**Shipped:** see `CHANGELOG.md` "[EPIC-14] - 2026-09-08 - API Documentation & Access Control".

## Decisions & why

- **Hand-authored the OpenAPI spec rather than generating it from the Zod schemas**, resolving
  US-14.3's "decide at phase start" open item. Deriving a spec from Zod would need an extra
  library (`zod-to-openapi` or similar) and would still only cover the _request_ side (query
  params) — response shapes, error envelopes, and the CSV export's content type would all need
  hand-authoring anyway. Given that, one hand-authored document plus a test that keeps it honest
  was less machinery for the same guarantee.
- **The honesty guarantee is a test, not a generator**: `openapiDocument.test.ts` reads
  `reconciliationRouter`'s own `stack` (the same data structure Express itself uses to route
  requests) and asserts the spec's documented `{method, path}` pairs match exactly. This means
  the spec cannot list a route that doesn't exist, or omit one that does, without the test suite
  catching it — the same "derive the check from what's actually true" pattern this repo already
  uses elsewhere (e.g. computing contrast ratios exactly in the Phase 9 accessibility review
  rather than eyeballing them).
- **Hand-rolled the Basic Auth middleware instead of a dependency** (`express-basic-auth` or
  similar) — ~40 lines, fully unit-tested, and using `crypto.timingSafeEqual` for the credential
  comparison rather than `===` (which leaks how many leading characters matched via response
  timing — not a realistic risk for a take-home, but free to fix correctly). Consistent with this
  repo's existing bias toward small hand-rolled pieces over dependencies when the piece is small
  and the dependency's main value (battle-testing) doesn't matter much at this scale — the same
  justification `useFocusTrap.ts` gives for not pulling in a focus-trap library.
- **Basic Auth gates only `/api/docs`, deliberately never `/api/reconciliation/*`.** This was
  planned explicitly in EPIC-14's backlog entry before implementation started, and the
  implementation follows it exactly: `attachMerchantContext` and the reconciliation router are
  mounted separately from the docs route, and a new integration test in `app.test.ts` confirms
  `/api/reconciliation/summary` still returns real data with zero credentials. Basic Auth is a
  meaningfully weaker mechanism than a real session (credentials resent every request, no
  expiry, no logout) and mixing it into the merchant-isolation boundary would have been a real
  regression in that boundary's strength, not just an odd choice.
- **Moved `attachMerchantContext` to mount after the health/docs routes** in `app.ts` (was:
  before everything). Functionally inert today — the mock middleware never rejects a request, it
  only sets `req.merchantId` — but it keeps the docs and health routes conceptually independent
  of merchant context, which matters more once EPIC-15 makes `attachMerchantContext` actually
  capable of rejecting a request.
- **Verified live, not just via Supertest**: started the real dev server and hit `/api/docs/`
  with `curl` for all three cases (no creds, wrong creds, correct creds), confirmed real Swagger
  UI HTML came back, and confirmed `/api/reconciliation/summary` and `/api/health` still worked
  unauthenticated — the same "drive the actual app" discipline used for the Phase 9
  accessibility Tab-cycle verification, not just trusting the test suite in isolation.
- **Removed one drafted test that didn't test what it claimed** (`app.test.ts`, a since-deleted
  case named around "never runs through merchant-context middleware" that didn't actually assert
  anything about merchant context) rather than leave a misleadingly-named assertion in the suite.

## Direction changes / pivots

None.

## Deferred / explicitly out of scope this session

- EPIC-15 (Dashboard Authentication) — planned and scoped in the prior session
  (`2026-09-08-epic14-15-planning.md`), implementation starts next in this same working session.

## Missed / noticed but not fixed

- A pre-existing moderate-severity transitive vulnerability surfaced by `npm audit` after adding
  `swagger-ui-express` (`qs` via `body-parser` via `express` itself, not the new dependency).
  `npm audit fix` alone doesn't resolve it without a breaking Express major-version bump, which
  wasn't requested and is out of scope for this addition — noted here rather than silently forced.

## Open questions for next session

- None specific to EPIC-14. Whether the default dev credentials (`admin`/`admin123`) need to be
  anything more than a documented, override-able default is a judgment call already made in
  favor of "works out of the box for review" — flagged in the README, not hidden.

## Resume point

- Next concrete action: implement EPIC-15 (Dashboard Authentication) per the acceptance criteria
  already in `docs/backlog/user-stories.md`.
- Minimum files to read first: `docs/architecture.md` §4 (the merchant-isolation non-negotiable
  and the exact swap point EPIC-15 targets), `apps/api/src/middleware/merchantContext.ts` (what's
  being replaced), `docs/backlog/tasks.md` EPIC-15 section (the coarse task list to work through).
