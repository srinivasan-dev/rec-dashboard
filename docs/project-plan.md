# Project Plan — Phase Tracker

Status tracker for the 13-phase build defined in `docs/prompts/MASTER_PROMPT.md`. Each phase
is completed and reviewed before the next starts. This file is updated as phases complete —
it's the fastest place to check "where are we." For Epic/User Story/Task-level tracking,
see [docs/backlog/](backlog/).

| #   | Phase                                                    | Status  | Deliverable                                                                                                                                                    |
| --- | -------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Product Thinking & UX                                    | ✅ Done | `docs/product-spec.md`, `docs/design/*.html`, `docs/to_submit/Part 1 - UX Product Doc.pdf`                                                                     |
| 2   | Repository & Architecture                                | ✅ Done | `apps/`, `packages/shared/`, `docs/architecture.md` — installs, typechecks, tests, and builds clean                                                            |
| —   | Engineering Standards & DX _(EPIC-EX)_                   | ✅ Done | Redux Toolkit (scoped), Jest+RTL+Playwright, pre-commit hook, `CLAUDE.md` + `docs/standards/*.md` — see `docs/backlog/`                                        |
| 3   | Reconciliation Engine                                    | ✅ Done | Domain types + deterministic rules in `packages/shared`, 28 unit tests, verified against real M-104 data                                                       |
| 4   | Backend API                                              | ✅ Done | 5 Express endpoints in `apps/api`, Zod validation, merchant isolation, 17 integration tests                                                                    |
| 5   | React Dashboard                                          | ✅ Done | Status/summary/exceptions table in `apps/web`, TanStack Query, URL-state filters, 19 tests                                                                     |
| 6   | Exception Detail UX                                      | ✅ Done | Accessible side drawer: focus trap, Escape, focus return, settlement/ledger detail, 6 tests                                                                    |
| 7   | Frontend Tests                                           | ✅ Done | RTL behavioral test suite covering all states — 33 `apps/web` tests, all 10 required scenarios                                                                 |
| —   | Design Implementation _(cross-cutting)_                  | ✅ Done | Approved Phase 1 visual design applied (CSS Modules, tokens, animation); drawer tabs incl. AI Explain wired to the Phase 4 stub — 37 `apps/web` tests          |
| 8   | LLM Explanation Feature                                  | ✅ Done | `ExceptionExplanationProvider` + `MockExplanationProvider`, deterministic fallback with hallucination/failure guards, `docs/ai-design.md`, 102 tests total     |
| 9   | Accessibility Review                                     | ✅ Done | WCAG 2.1 AA audit + fixes, `docs/accessibility.md` — found and fixed a real focus-trap escape bug plus 2 failing color-contrast tokens, 39 `apps/web` tests    |
| 10  | Stakeholder Memo                                         | ✅ Done | `docs/stakeholder-memo.md` — ~1 page, non-technical, for Head of Merchant Support                                                                              |
| 11  | README                                                   | ✅ Done | Full root `README.md` — problem through production improvements, ~5-minute read                                                                                |
| 12  | Final Engineering Review                                 | ✅ Done | Scored review (~9/10 composite) across 12 dimensions, no P0/P1 found, one P2 fixed — see `docs/sessions/2026-09-08-phase12-final-review.md`                    |
| 13  | Live Interview Prep                                      | ✅ Done | `docs/interview-prep/` — 25 Q&A grounded in the implementation, plus an honest "do not claim" list                                                             |
| —   | API Documentation & Access Control _(user-requested)_    | ✅ Done | Swagger/OpenAPI UI for all endpoints, gated behind HTTP Basic Auth — see `docs/backlog/` EPIC-14                                                               |
| —   | Dashboard Authentication _(user-requested)_              | ✅ Done | Simple login mechanism; `attachMerchantContext` derives merchant identity from a real session instead of a hardcoded mock — see `docs/backlog/` EPIC-15        |
| —   | Toolbar Redesign & Advanced Filtering _(user-requested)_ | ✅ Done | Clickable exception-breakdown pills, working filter/sort/export icon menus, Kibana-style date range picker, CSV/Excel/PDF export — see `docs/backlog/` EPIC-16 |

## Notes

- Phases run in order; each one's stated "do not build X yet" boundary is respected — e.g.
  Phase 2 set up tooling and structure only, no reconciliation logic.
- `docs/architecture.md` §9 and `docs/product-spec.md` §14 hold the running list of assumptions
  made along the way — check there before re-deriving a decision that's already been made.
- This tracker is documentation, not enforcement — if a later phase reveals an earlier decision
  needs revisiting, that's expected and should be noted here rather than silently reworked.
- The three rows after Phase 13 are not part of MASTER_PROMPT's original 13-phase plan — all 13
  were complete before any of them was added (2026-09-08, direct user request). Tracked as their
  own rows/epics (`docs/backlog/` EPIC-14, EPIC-15, EPIC-16) rather than folded into an
  already-"done" phase's numbers, the same treatment EPIC-EX got when it was added mid-build.
