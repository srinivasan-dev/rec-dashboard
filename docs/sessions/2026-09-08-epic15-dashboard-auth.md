# 2026-09-08 — EPIC-15: Dashboard Authentication

**Phases/epics touched:** EPIC-15 (implementation), following EPIC-14 in the same working session.
**Shipped:** see `CHANGELOG.md` "[EPIC-15] - 2026-09-08 - Dashboard Authentication".

## Decisions & why

- **Signed, stateless JWT in an httpOnly cookie, not a server-side session store.** No new
  infrastructure (a session table, Redis, etc.) needed for a take-home; the signature alone is
  what makes a client-presented token trustworthy. Chosen over a plain opaque session ID
  specifically because it needs no lookup on every request — `verifySession` is pure and
  synchronous, consistent with this repo's existing bias toward simple, boring mechanisms
  (`docs/architecture.md`'s own "prefer the boring, explicit, testable option").
- **`bcryptjs` over `bcrypt`.** `bcrypt` has native bindings that can fail to install without
  build tools present (a real risk on a fresh Windows machine, which is exactly this
  environment); `bcryptjs` is pure JS, slightly slower, functionally identical for one
  password-verification call per login. Correct trade-off for a take-home's portability
  requirements over raw hashing throughput nobody will notice at this scale.
- **`attachMerchantContext` now genuinely rejects unauthenticated requests (401), not just
  changes where its value comes from.** This was the one point where the acceptance criteria
  written during the prior planning session (`2026-09-08-epic14-15-planning.md`) turned out to
  be slightly wrong once actually implemented: US-15.2 said "existing cross-merchant-isolation
  tests keep passing unmodified," written before actually reading `reconciliation.test.ts`. Once
  implemented, all 16 of those tests broke (expected 200/404/400, got 401) because they'd never
  needed to authenticate before -- the honest fix was updating them to log in via a
  `supertest.agent` first (reusing its cookie jar across requests, the same way a browser would),
  not softening the middleware to keep them passing unauthenticated. Noted here explicitly
  because pretending the original acceptance criterion held exactly as written would misstate
  what actually happened.
- **Generic "Invalid username or password" for both wrong-password and unknown-username.**
  Distinguishing the two would let an attacker enumerate valid usernames -- a small, standard
  precaution that costs nothing extra here since there's exactly one demo account anyway, but
  written as if there were many (matches how a real multi-account system would need to behave).
- **`queryClient.clear()` on logout, not just a redirect.** Without this, cached summary/
  exceptions/explanation data would still be sitting in TanStack Query's cache after logout --
  harmless in a single-user demo, but a real, easy-to-miss bug in any scenario where a different
  merchant might log in on the same browser tab afterward and briefly see stale data from the
  previous session before their own fetch resolved. Cheap to get right, so it was.
- **Basic Auth (EPIC-14) and the new session login are deliberately kept separate and unmixed.**
  Verified concretely, not just asserted: a new `unauthenticated access` test confirms all 5
  reconciliation endpoints 401 with zero session, and the existing `/api/docs` tests from EPIC-14
  still pass unchanged, proving the two auth mechanisms don't interfere with each other's routes.
- **Moved app.ts's mount order** so `/api/health`, `/api/docs`, and `/api/auth` are all reachable
  before `attachMerchantContext` runs -- necessary now that the middleware can actually reject a
  request (previously cosmetic, per the EPIC-14 session log's own note that this mattered "once
  EPIC-15 makes `attachMerchantContext` actually capable of rejecting a request").
- **This app's first real client-side routing.** `App.tsx` previously had no `<Routes>` at all
  (BrowserRouter was used only for `useSearchParams`). Adding `/login` as a genuinely separate
  route, with `RequireAuth` gating everything else, is a real architectural change to the
  frontend, not just a new component -- documented as such rather than treated as incidental.
- **Verified live in a real browser (Playwright), not just via Jest/Supertest**, following this
  repo's established pattern (the Phase 9 accessibility Tab-cycle check, the EPIC-14 curl
  verification). Screenshots were reviewed directly, not just "the script exited 0" -- confirmed
  the login page, the inline error state, and the post-login dashboard (including the new "Log
  out" button) all render correctly against the approved design tokens.

## Direction changes / pivots

- US-15.2's acceptance criterion ("existing tests keep passing unmodified") was revised on
  contact with the real test file -- see "Decisions & why" above. The _intent_ (merchant
  isolation still holds) was preserved and is now covered by more tests than before (a
  dedicated no-session-at-all case that didn't previously need to exist), just not literally
  "unmodified."

## Deferred / explicitly out of scope this session

- Everything `docs/backlog/`'s EPIC-15 entry already scoped out: SSO, password reset, MFA,
  multi-account support. Still correctly out of scope -- "simple" was the ask.
- Cross-origin production cookie behavior (SameSite=None + Secure + a real reverse-proxy or CORS
  setup) is documented as a consideration (`WEB_ORIGIN`, `credentials: true`) but not deployed or
  tested against an actual cross-origin setup -- the dev flow (Vite proxy, same-origin from the
  browser's perspective) is what's actually verified.

## Missed / noticed but not fixed

- None new this session.

## Open questions for next session

- None specific to EPIC-15. Both user-requested epics (14 and 15) are now complete; the standing
  open questions are the pre-existing ones in `docs/project-overview.md`'s "Known open gaps."

## Resume point

- No further MASTER_PROMPT phase or user-requested epic is currently open. If work continues, the
  next candidates are either the pre-existing "Known open gaps" (responsive/mobile audit,
  per-journey e2e specs are the two most consequential per the Phase 13 interview-prep
  prioritization) or whatever the user requests next.
- Minimum files to read first if resuming auth-adjacent work: `apps/api/src/auth/session.ts` and
  `userStore.ts` (the whole mechanism in ~60 lines combined), `apps/api/src/middleware/
merchantContext.ts` (the enforcement point), `apps/web/src/auth/` (the three frontend pieces).
