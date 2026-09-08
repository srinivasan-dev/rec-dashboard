# Frontend Standards — React / TypeScript

Applies to `apps/web`. Read `docs/product-spec.md` first for the UX contract (states, exception
language, accessibility commitment) — this doc is the engineering _how_.

## State management boundaries — read this before adding state anywhere

Three places state can live. Picking the wrong one is the most common React anti-pattern in
practice, so be deliberate:

| State                                                               | Lives in                 | Why                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anything from the API (summary, exceptions, exception detail)       | **TanStack Query**       | It's a cache of server truth — Query handles loading/error/refetch/staleness for free. Never copy a query result into Redux or `useState` "to make it easier to use" — read it from the query hook where it's needed.                                                                                                                 |
| Filters, sort, page number, selected date range                     | **URL search params**    | Per `docs/product-spec.md` §7 and success criterion 4: shareable, survives refresh, back/forward just works. If you can't answer "should this survive a page refresh and be shareable via URL?" with yes, it's not URL state.                                                                                                         |
| Transient, non-shareable UI state (toasts, this-session-only flags) | **Redux (`src/store/`)** | Scoped narrowly — see `uiSlice.ts`. This project uses Redux Toolkit per the assessment brief's "Redux or an equivalent if the state genuinely warrants it." Before adding a new slice, ask: does this need to be global, or would `useState` in the nearest common parent do? Most component-local state should stay component-local. |

**Anti-patterns to reject in review:**

- Storing API response data in a Redux slice "for caching" — that's TanStack Query's job, and
  doing both means two sources of truth that can disagree.
- Storing filter/sort/page in Redux instead of the URL — breaks shareability and refresh
  behavior that the product spec explicitly commits to.
- A `useState` + `useEffect` combo that re-derives something already available from a query or
  the URL — derive it inline instead of duplicating state.

## Component structure

- Function components with hooks only — no class components.
- One component's primary export per file; colocate its test (`Thing.tsx` + `Thing.test.tsx`)
  and any component-only helpers in the same folder.
- Keep components focused on rendering + wiring; push non-trivial logic (formatting, derived
  calculations) into named functions or hooks that can be unit tested independent of rendering.
- Props: explicit interface per component, no inline object types for anything with more than
  one field.

## Data fetching (TanStack Query)

- One custom hook per query (e.g. `useReconciliationSummary(merchantId)`), not raw
  `useQuery` calls scattered through components — keeps the query key and fetch logic in one
  place, testable and reusable.
- Query keys are arrays that include every parameter the query depends on (e.g.
  `['exceptions', merchantId, filters, page]`) — an incomplete key causes stale-cache bugs that
  are painful to debug later.
- Every query-driven view implements all four states explicitly (loading / error / empty /
  populated) — don't rely on TanStack Query's defaults rendering something reasonable by
  accident. See `docs/product-spec.md` §8 for the copy and intent of each state.

## Accessibility (non-negotiable, not a Phase-9 afterthought)

- Semantic HTML first: real `<table>`/`<th scope="col">`, `<button>` for actions (never a `<div
onClick>`), `<label>` (or `aria-label`) on every form control.
- Every interactive element is keyboard-reachable and operable — test this by tabbing through a
  view without touching the mouse before calling it done.
- Status is never color-only — pair it with text and/or an icon with an accessible name.
- A drawer/modal traps focus while open, returns focus to its trigger on close, and closes on
  `Escape`.
- Loading and error states use `aria-live` regions so screen reader users aren't left guessing.

## Testing (Jest + React Testing Library)

- Runner is **Jest**, not Vitest — see `docs/architecture.md` §6 for why this was corrected to
  match the assessment brief's explicit "Jest + React Testing Library" requirement.
- Query by role/label/text (`getByRole`, `getByLabelText`) — the same way a user or a screen
  reader finds things. Avoid `data-testid` unless there's genuinely no accessible way to target
  an element (and if that's true, it's usually an accessibility gap worth fixing instead).
- Test behavior, not implementation: assert on what's rendered and what happens after an
  interaction, not on internal state or which function was called.
- No snapshot tests for behavior-critical components — a snapshot passes when a change was
  intended _and_ when a regression slipped in; it can't tell the difference.
- Minimum required coverage (per the assessment brief): the exceptions table — filtering,
  sorting, pagination, loading state, empty/all-clear state, error state, retry.

## E2E (Playwright)

- Lives in `apps/web/e2e/`, separate from unit tests (`apps/web/src/**/*.test.tsx`) — different
  purpose, different runner, and Jest's `testMatch` deliberately excludes this folder.
- E2E specs map to the product's core journeys (`docs/product-spec.md` §4), not to individual
  components — that's what the unit tests are for. One spec per journey, not one per page.
- Keep the suite small and high-value. E2E tests are slow and more brittle than unit tests by
  nature; reach for them for "does the whole flow actually work end to end," not for logic that
  a unit test could verify faster and more precisely.

## Naming & style

- Components: `PascalCase.tsx`. Hooks: `useCamelCase.ts`. Everything else: `camelCase.ts`.
- No `any`; no disabling ESLint rules inline without a comment explaining why.
- Co-locate a feature's pieces (component, hook, test) rather than splitting by file type
  (`components/`, `hooks/`, `tests/` as parallel top-level trees) once the dashboard has more
  than a couple of features — easier to find everything relevant to one screen.

## Performance (apply only where it matters)

- Don't reach for `useMemo`/`useCallback`/`React.memo` preemptively — this is a data-dense
  dashboard, not an animation-heavy app. Add memoization when a specific, measured re-render
  problem shows up (e.g. re-sorting a large exceptions table on every keystroke in an unrelated
  filter), not by default.
- Pagination is server-side (the API paginates), not "fetch everything and slice client-side."
