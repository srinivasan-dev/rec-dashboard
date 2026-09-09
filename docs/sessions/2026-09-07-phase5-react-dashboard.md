# 2026-09-07 — Phase 5: React Dashboard

**Phases/epics touched:** Phase 5 (React Dashboard).
**Shipped:** see `CHANGELOG.md` "[Phase 5] - 2026-09-07 - React Dashboard".

## Decisions & why

- **Split page-level and table-level query state.** `Dashboard` derives loading/error/all-clear
  from the summary query alone; the exceptions-list query only drives its own
  loading/error/populated state for the table region. A filter change re-renders only the
  table's own loading state, not the whole page shell. Gated with `enabled: hasExceptions` so
  the exceptions query doesn't even fire until the summary has confirmed there's something to
  fetch (see "Fixed" below — this was a real bug caught by test noise, not a preemptive
  optimization).
- **`BrowserRouter` used only for `useSearchParams`.** No `<Routes>`/`<Route>` — this is a
  single-dashboard experience (`docs/product-spec.md` §7), not a multi-page app. Using the
  already-installed `react-router-dom` for URL state (rather than hand-rolling
  `URLSearchParams` + `history.pushState`) keeps back/forward navigation and popstate handling
  correct for free.
- **Wire-contract types duplicated in `apps/web/src/api/types.ts`**, not imported from
  `apps/api`. `docs/architecture.md` §5 is explicit that `apps/web` never imports `apps/api`
  code directly; the one type actually reused from `packages/shared` is `ExceptionReason` (pure
  domain vocabulary, not an API-specific shape — the DTOs themselves differ from
  `packages/shared`'s types because the API serializes money to decimal strings, not minor-unit
  numbers).
- **Row action ("View details") is a real `<button>` with `aria-label`**, not a `<div
onClick>` — reachable and operable via keyboard by construction, not by extra ARIA
  plumbing bolted on afterward.
- **Currency display formatting stays string-based** (`formatCurrencyAmount` in
  `formatting.ts`) — thousands separators inserted via regex on the decimal string, never
  `parseFloat`. Consistent with the project's money-is-never-a-float rule even at the display
  edge, where it would otherwise be tempting to reach for `Intl.NumberFormat` on a parsed number.
- **Integration tests mock only `fetchSummary`/`fetchExceptions`, not `buildExportUrl`.**
  `jest.mock('../api/reconciliation')` auto-mocks the whole module; the first pass of
  `Dashboard.test.tsx` mocked everything and got a silent bug (see "Fixed"). Fixed with
  `jest.requireActual` to keep the pure `buildExportUrl` function real — only functions that
  make a network call need mocking.
- **Verified in a real browser, not just RTL.** `chromium-cli` wasn't available in this
  environment; wrote a small Playwright driver script directly against the already-running dev
  servers (API real, not mocked) instead. Screenshots confirmed the full flow — populated
  dashboard → filter narrows table → row action opens detail placeholder — with zero console
  errors. This is the kind of check RTL alone can't give: RTL mocks the API, so it would never
  have caught a real integration mismatch between `apps/api`'s actual response shape and
  `apps/web`'s assumed DTO types.

## Direction changes / pivots

None — Phase 5 was built to its stated MASTER_PROMPT scope without needing to revisit earlier
decisions.

## Deferred / explicitly out of scope this session

- **Responsive/mobile layout** (`docs/product-spec.md` §11: stacked transaction cards, collapsible
  filter panel) — **not implemented**. There is currently no CSS at all in `apps/web` — the
  entire UI is unstyled semantic HTML, desktop-only, laid out in default browser style (see the
  screenshots referenced in this session). This is recorded as 🧊 Deferred in
  `docs/backlog/user-stories.md` (US-05.3), not silently skipped. MASTER_PROMPT Phase 5 says
  "Do not use giant skeleton animations or excessive visual polish. Prioritize clarity," which
  covers the _no-polish_ decision, but responsive layout is a distinct, spec'd requirement that
  wasn't addressed. **Flag this explicitly if visual/responsive work is expected before
  submission** — it isn't a Phase 6+ item in MASTER_PROMPT's plan, so it would need to be picked
  up as unscheduled work, most likely alongside Phase 9 (Accessibility Review) or as its own pass
  before Phase 11 (README/submission).
- Real exception detail drawer — intentionally Phase 6's job (`ExceptionDetailPlaceholder` is a
  deliberate stub, see code comment).
- `CURRENCY_MISMATCH`'s merchant-facing label/next-step text (`exceptionLabels.ts`) is original
  content, not copied from `docs/product-spec.md` §9 (which only covers the original 5 reasons) —
  same gap already flagged in the EPIC-EX session log for the API's stub-explanation text. Both
  need a product-language review pass before submission.

## Missed / noticed but not fixed

- Fixed, but worth recording: the first draft of `Dashboard.test.tsx` used
  `jest.mock('../api/reconciliation')` (full auto-mock), which silently made `buildExportUrl`
  return `undefined`, so the all-clear test's `ExportButton` had no `href` and thus no
  accessible "link" role. Caught immediately by the test itself failing — a good example of why
  `getByRole` queries catch real accessibility regressions, not just "does this render."
- Also fixed: the exceptions query firing unconditionally (before `enabled` gating) produced
  console noise ("Query data cannot be undefined") in every test that didn't populate exceptions
  — caught by reading test output carefully, not by a dedicated assertion. Worth remembering:
  console noise during a passing test run is often a real bug wearing a passing test as a
  disguise.

## Open questions for next session

- Should the responsive/mobile gap (above) be scheduled explicitly, or left until closer to
  submission? Not answered here — flagging it is this session's job, deciding priority is the
  user's.

## Resume point

- Next concrete action: Phase 6 — Exception Detail UX (`apps/web`): replace
  `ExceptionDetailPlaceholder` with a real accessible side drawer — settlement/ledger detail
  side by side, computed difference, next-step text (already available in `exceptionLabels.ts`),
  focus trap, `Escape` to close, focus return to the triggering row button, preserved table
  filters/pagination/scroll while open.
- Minimum files to read first: `docs/product-spec.md` §7 (the drawer wireframe) and its example
  language block (AMOUNT_MISMATCH's "Processor settlement / Internal ledger / Difference /
  Explanation" format); `docs/product-spec.md` §12 accessibility commitment's drawer/modal
  bullet; `apps/web/src/dashboard/exceptionLabels.ts` and `ExceptionDetailPlaceholder.tsx`
  (what's being replaced) — don't re-derive the exception-detail data shape, it's already on
  `ExceptionDto` from Phase 4.
