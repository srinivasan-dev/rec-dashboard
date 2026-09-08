# 2026-09-07 — EPIC-EX: Engineering Standards & Developer Experience

_(Reconstructed from `CHANGELOG.md` — see the note in `docs/sessions/README.md`.)_

**Phases/epics touched:** EPIC-EX (cross-cutting, not tied to a single MASTER_PROMPT phase).
**Shipped:** see `CHANGELOG.md` "[Unreleased] — Engineering Standards and Developer Experience".

## Decisions & why

- **Redux Toolkit scoped narrowly**, to non-shareable UI state only (`uiSlice`: exception drawer
  selection, toast notifications). Server state stays entirely in TanStack Query; shareable/
  bookmarkable state (filters, sort, pagination) stays in URL params. Redux does not duplicate
  either. This is the rule most likely to erode over time as the dashboard gets built — see
  `docs/standards/frontend-standards.md` "State management boundaries" for the exact boundary
  and named anti-patterns (e.g. don't cache API data in Redux, don't put filters there instead
  of the URL).
- Husky pre-commit (lint-staged + full typecheck) and commit-msg (commitlint, Conventional
  Commits) hooks added now, before any real feature code exists, so every subsequent phase is
  gated from the start rather than retrofitted.
- `CLAUDE.md` + `docs/standards/*.md` written now specifically so they're auto-loaded/available
  before Phase 3 feature work begins.

## Direction changes / pivots

- **Vitest → Jest** for `apps/web` unit tests. `apps/web` was originally scaffolded with Vitest
  in the Phase 2 session. Re-auditing `docs/assessment-brief.pdf` during this session found it
  names **Jest** specifically for frontend tests — not "Jest or equivalent," unlike its Redux
  clause which does allow an equivalent. Migrated to Jest + Babel + React Testing Library;
  removed Vitest config/deps. Typecheck was unaffected since Babel only strips types (`tsc
--noEmit` still does the real checking). **Lesson:** re-read the literal brief wording per
  clause — it distinguishes "must be X" from "X or equivalent" clause by clause, and it's easy to
  miss that distinction when skimming.

## Deferred / explicitly out of scope this session

None new — this was a tooling/DX hardening pass, not a scope-cutting one.

## Missed / noticed but not fixed

- Found (and fixed, so not actually "missed" — but worth knowing the mockups had bugs at all):
  two data-accuracy bugs in the Phase 1 HTML mockups (`docs/design/*.html`):
  - Hardcoded "Checked"/"Matched" stat tiles read 15/10 instead of the real M-104 figures
    (**14/9**, derived directly from `data/`).
  - The AED financial-impact chip for the missing-ledger exception was undercounted — showed
    148.65 AED, corrected to **1,533.31 AED** (it had summed one transaction instead of all
    contributing transactions).
  - These corrected figures are recorded in `docs/project-overview.md` "Ground-truth figures to
    validate Phase 3 against" — worth checking the real engine's output against them once built.
  - Takeaway: the Phase 1 mockups are static HTML, not derived from live code — they can drift
    from the actual data silently. Don't treat anything in `docs/design/*.html` as verified
    unless it's been checked against `data/*.csv` directly.

## Open questions for next session

- None new. Phase 3 is ready to start with no blocking unknowns from this session.

## Resume point

- Next concrete action: Phase 3 — Reconciliation Engine (`packages/shared`): domain types +
  deterministic rules, unit tests against the real M-104 CSVs in `data/`.
- Minimum files to read first: `docs/architecture.md` §§3-4, 7-8 (reconciliation boundary,
  merchant isolation, error handling, monetary precision) and `docs/product-spec.md` §9
  (exception language, all 5 exception types) — the engine's exception types and language must
  match what's already specified there, not be invented fresh.
