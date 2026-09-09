# 2026-09-07 — Phase 6: Exception Detail UX

**Phases/epics touched:** Phase 6 (Exception Detail UX).
**Shipped:** see `CHANGELOG.md` "[Phase 6] - 2026-09-07 - Exception Detail UX".

## Decisions & why

- **Drawer fetches its own data via a dedicated query hook**, rather than reusing the
  `ExceptionDto` already sitting in the table's loaded page. Slightly more network traffic, but
  correct even if the merchant changes filters/pages while the drawer is open — reusing the
  row's in-memory object would silently go stale in that case. This also finally exercises
  Phase 4's `GET /exceptions/:id` endpoint, which had zero callers until now.
- **Hand-rolled focus trap** (`useFocusTrap.ts`, ~45 lines) instead of a library
  (`focus-trap-react`, `react-focus-lock`). The logic is small and this is the only place in the
  app that needs it — a dependency would be more code to audit for less code saved.
- **Explanation text stays the static, already-product-reviewed sentence from
  `exceptionLabels.ts`**, not a dynamically-generated sentence embedding the computed figures
  (MASTER_PROMPT's own Phase 6 example shows a dynamic sentence: "The ledger contains $24.31
  less than..."). Chose to show the computed facts as separate labeled rows instead (which
  matches `docs/product-spec.md` §7's own wireframe layout) and keep the sentence itself static.
  Building a fact-to-prose generator is explicitly Phase 8's job (`ExceptionExplanationProvider`
  / deterministic fallback) — doing it here would preempt that phase's actual scope.
- **Closed a real product gap**: the Phase 1 self-review (`docs/product-spec.md` Appendix)
  flagged "Limited exception detail for duplicates — doesn't show which ledger entries are the
  duplicates" as one of the three weakest decisions. `duplicateLedgerEntries` was already on the
  API's `ExceptionDto` (Phase 4) but nothing rendered it until now — the drawer shows both
  entries by `ledgerId`, amount, and date.
- **`role="dialog"` + `aria-modal="true"`**, not a non-modal panel — `docs/product-spec.md` §12's
  focus-trap requirement implies modal semantics (a non-modal panel wouldn't warrant trapping
  focus at all).

## Direction changes / pivots

None — built to Phase 6's stated scope.

## Deferred / explicitly out of scope this session

- Real dynamic explanation-text generation — Phase 8, per the decision above.
- Nothing else new; the responsive/mobile gap from Phase 5 remains open and untouched.

## Missed / noticed but not fixed

- **Fixed, but worth recording in detail**: `ExceptionDrawer.test.tsx`'s first draft had 2 of 6
  tests fail _only_ when run as part of the full file (both passed in isolation). Root cause:
  two earlier tests opened the drawer to assert on its content but never closed it before the
  test ended; RTL's automatic unmount-on-cleanup then ran this session's focus-trap cleanup
  (`previouslyFocusedRef.current?.focus()`) against a DOM node that was mid-removal, and the
  resulting `document.activeElement` state leaked into the _next_ test's fresh
  `useFocusTrap` invocation, breaking its focus-into-drawer behavior deterministically (not
  flaky once understood — reproduced 100% until fixed, and fully stable across 3 repeat runs
  after). Fixed by having every test explicitly close the drawer (click Close, or accept that
  the test's whole point is to click Close) before ending, rather than leaving transient UI
  state open across a test boundary. **Lesson for future component tests with focus-management
  side effects**: always return the DOM to a closed/clean state before the test function
  returns — don't rely on unmount cleanup alone to do it, since cleanup ordering interacts with
  jsdom's global `activeElement` in ways that leak across tests.

## Open questions for next session

None blocking. Phase 7 is ready to start.

## Resume point

- Next concrete action: Phase 7 — Frontend Tests. The assessment brief's explicitly required
  coverage list (render populated, filter, sort, pagination, loading, all-clear/empty, API
  error, retry, opens detail, export) is now _mostly_ already covered incidentally by Phases
  5-6's own tests (`Dashboard.test.tsx`, `ExceptionsTable.test.tsx`, `ExceptionDrawer.test.tsx`,
  `useExceptionsFilters.test.tsx` — 25 tests total in `apps/web`). Phase 7's job is to check that
  list item-by-item against what actually exists, fill any real gaps (e.g. export-button
  testing, retry-then-succeeds flows), and remove any snapshot-style or implementation-coupled
  assertions — not to write a second parallel suite from scratch.
- Minimum files to read first: `docs/standards/frontend-standards.md` "Testing" section (the
  exact coverage list + query-by-role/label convention already being followed) and
  `docs/prompts/MASTER_PROMPT.md`'s Phase 7 section, then run `npm run test --workspace=apps/web`
  and read what's already there before writing anything new.
