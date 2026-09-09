# 2026-09-08 — Phase 12: Final Engineering Review

**Phases/epics touched:** Phase 12.
**Shipped:** see `CHANGELOG.md` "[Phase 12] - 2026-09-08 - Final Engineering Review".

## Decisions & why

- **Inspected before touching any code**, per MASTER_PROMPT's explicit instruction. Read the full
  reconciliation engine (`packages/shared/src/reconcile.ts`, `money.ts`, `parsing.ts`), the
  entire API layer (middleware, controller, service, repository, validation, both explanation
  services), and the frontend's state-boundary-critical files (`Dashboard.tsx`,
  `ExceptionsTable.tsx`, `useExceptionsFilters.ts`, `useFocusTrap.ts`, `formatting.ts`) end to
  end rather than sampling — this is a small enough codebase (~40 source files) that a Staff
  Engineer doing a real pre-merge review would read all of it, not extrapolate from a sample.
- **Found exactly one real defect**, not manufactured findings to justify the phase: the `reason`
  URL query parameter in `useExceptionsFilters.ts` was cast to `ExceptionReason` without checking
  it was actually one of the six valid values (`sortBy`/`sortOrder` in the same file already did
  this correctly). Classified P2, not P0/P1 — the API's Zod schema (`exceptionsQuery.ts`) already
  rejects an invalid `reason` server-side with a proper 400, so the blast radius was "a hand-typed
  bad URL shows the table's generic error state instead of silently clearing the filter," not a
  data-integrity or security issue. Fixed anyway since it was a one-line, low-risk change
  (reusing `EXCEPTION_LABELS`' keys as the validation source, so there's no second list to drift
  from the first) — consistent with MASTER_PROMPT's "fix P1 if it materially improves the
  submission... avoid cosmetic P2 unless trivial." This one was trivial and is exactly the kind
  of paired inconsistency (`sortBy` validated, `reason` not) a reviewer would flag.
- **Did not find and therefore did not fix**: any hardcoded reconciliation result (`reconcile()`
  runs identically over whatever merchants/keys are present — verified by reading it, not just
  trusting the docstring), merchant data leakage (every read path is keyed off
  `req.merchantId` set by server-side middleware, never `req.query`/`req.body`/`req.params`; the
  controller even comments this rule inline), float money bugs (`parseAmountToMinorUnits` does
  string-only decimal parsing, no `parseFloat`), business logic in controllers or components
  (controllers only orchestrate service calls + status codes; `Dashboard.tsx`/`ExceptionsTable.tsx`
  only render and dispatch — all reconciliation, filtering, and sorting logic lives in
  `packages/shared` or the API service layer), inaccessible table rows (sortable `<th>` are real
  `<button>`s with `aria-sort`, row actions are real `<button>`s with descriptive `aria-label`s,
  not `onClick` on a `<div>` or `<tr>`), or `any` usage anywhere in non-test, non-comment code
  (grepped explicitly).
- **Scored against the current, verified state** — all 12 dimension scores below are grounded in
  the file reads above plus this session's own fresh `typecheck`/`lint`/`test`/`build` run
  (103 tests green, clean typecheck/lint, successful Vite build), not carried over from an
  earlier phase's numbers.

## Scores (1–10)

| Dimension                           | Score | Why                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product judgment                    | 9     | Calm exception language, 4-state UX discipline actually followed everywhere (not just claimed), all-clear treated as a real state. Docked 1 for the still-open "no data-freshness indicator" gap self-identified in `docs/product-spec.md` §14.                                                                                                                                                   |
| Payments/reconciliation correctness | 9     | Composite `merchantId::transactionId` key, explicit rule precedence with a documented rationale for the order, net-vs-gross comparison decision stated and defensible, currency-mismatch checked before amount diffing. Docked 1 because `CURRENCY_MISMATCH` copy is unreviewed content (self-flagged).                                                                                           |
| TypeScript quality                  | 9     | No `any` anywhere in source; discriminated exception shape narrows cleanly; one `// unreachable, narrows types for TS` comment is honest about its purpose rather than hiding a cast.                                                                                                                                                                                                             |
| Backend architecture                | 9     | Clean layering (routes → controller → service → repository), repository is swappable for a real DB behind the same signature, in-memory cache is a stated Phase-appropriate choice, not an accident.                                                                                                                                                                                              |
| API design                          | 8     | Consistent `{ data, pagination }` / `{ error: { code, message } }` envelopes, Zod-validated query params with real 400s, sensible REST resource shape. Docked for CSV export reusing filters but not pagination/sort — a minor asymmetry, not a bug.                                                                                                                                              |
| React architecture                  | 9     | TanStack Query owns server state, Redux owns only drawer UI state, URL owns filters — the exact three-way split `docs/standards/frontend-standards.md` commits to, actually followed. Query-driven independent loading states per region (page shell vs. table) is a real design choice, not incidental.                                                                                          |
| Testing                             | 8     | 103 tests, all 4 UX states covered per view, a genuine regression test for the Phase 9 focus-trap bug (verified to fail without the fix). Docked 2 for the self-identified, still-open gap: no per-journey Playwright e2e specs beyond one smoke test.                                                                                                                                            |
| Accessibility                       | 9     | Real focus trap with a documented and fixed escape bug, WCAG-AA contrast computed (not eyeballed) with 2 failing tokens found and fixed, proper heading structure, ARIA tabs pattern. Docked 1 for the self-flagged non-roving-tabindex tab pattern (a stated, deliberate deferral, not an oversight).                                                                                            |
| Security / merchant isolation       | 10    | `merchantId` is server-middleware-assigned, never client-supplied, at every single read path — verified directly in the controller and service code, not just asserted. `getExceptionById` is scoped so a valid transaction ID for another merchant correctly returns not-found.                                                                                                                  |
| AI safety / design                  | 9     | Structural grounding (a 7-field DTO, not the raw domain object) plus two independent fallback guards (provider throws, or output fails length/banned-language checks), both routing to the same deterministic explanation. `generatedBy` never lies about AI involvement. Docked 1 for no logging/observability distinguishing the two fallback triggers (self-flagged as the natural next step). |
| Documentation                       | 10    | Deliberately non-duplicated doc map (project-overview → sessions → plan → backlog → per-topic docs), a session-log system that actually gets used every phase, an honest "Known open gaps" list that this review confirmed rather than had to invent.                                                                                                                                             |
| Maintainability                     | 9     | Small, single-purpose modules; the repository-swap seam for a real DB is real, not aspirational; the one hand-rolled abstraction (`useFocusTrap`) is justified in its own comment as smaller than pulling in a dependency.                                                                                                                                                                        |

**Composite: ~9/10.** This is a strong, honestly-scoped submission — the main gap between 9 and
10 is self-identified deferred work already tracked in `docs/project-overview.md`, not undiscovered defects.

## P0 / P1 / P2

- **P0 (issues that could cause rejection):** none found.
- **P1 (important fixes):** none found that would materially improve the submission beyond what's
  already tracked as a known, deliberate gap.
- **P2 (polish):**
  1. **Fixed this session** — `useExceptionsFilters.ts`'s `reason` param wasn't validated against
     the known reason list before being cast, unlike its sibling `sortBy`/`sortOrder` fields.
  2. Not fixed (cosmetic, per MASTER_PROMPT's "avoid spending time on cosmetic P2 unless
     trivial"): CSV export (`exportExceptionsHandler`) accepts filter params but not
     sort/pagination — reasonable for a full-export use case, just asymmetric with the list
     endpoint. Worth a one-line README/API-docs note if a reviewer asks, not a code change.
  3. Everything else surfaced by this review was already self-identified in
     `docs/project-overview.md`'s "Known open gaps" section (responsive/mobile audit,
     `CURRENCY_MISMATCH` copy review, topbar/footer stub buttons, e2e journey specs, roving
     tabindex, fallback-reason logging) — re-confirmed as still accurate and still open, not
     newly discovered.

## Direction changes / pivots

None.

## Deferred / explicitly out of scope this session

- All items in `docs/project-overview.md`'s "Known open gaps" remain deferred, per that doc's own
  status — this review's job was to confirm they're still the right list, not to schedule them.

## Missed / noticed but not fixed

- CSV export filter/sort asymmetry (P2 #2 above) — noted, not changed, per MASTER_PROMPT's
  guidance to skip cosmetic P2s.

## Open questions for next session

- None new. The pre-existing open questions in `docs/project-overview.md` stand.

## Resume point

- Next concrete action per `docs/project-plan.md`: **Phase 13 — Live Interview Preparation**.
  MASTER_PROMPT's own instruction: "stop coding," act as the interviewer, prepare the 25 most
  likely questions grounded strictly in this repository, each with what's being tested, a strong
  1–2 minute answer, likely follow-ups, and a flag for anything that shouldn't be claimed or
  can't be defended.
- Minimum files to read first: this session log (has the fresh P0/P1/P2 state); `docs/ai-design.md`
  and `docs/accessibility.md` (the two areas MASTER_PROMPT's Phase 13 question list leans on
  hardest); `docs/architecture.md` §4/§8/§9 (merchant isolation, money handling, assumptions —
  the three non-negotiables most likely to be probed directly).
