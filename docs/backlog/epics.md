# Epics

One epic per build phase (`docs/prompts/MASTER_PROMPT.md`), plus EPIC-EX for cross-cutting
engineering standards work. See `docs/project-plan.md` for the same list framed as a delivery
tracker rather than a backlog.

| ID      | Epic                                         | Status  | Outcome                                                                                                                                                                             |
| ------- | -------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EPIC-01 | Product Thinking & UX Framing                | ✅ Done | A defensible product spec exists before any code — problem, users, journeys, states, exception language, wireframes, accessibility commitment, success metric.                      |
| EPIC-02 | Platform Foundation                          | ✅ Done | A working, tested, typed monorepo skeleton (`apps/api`, `apps/web`, `packages/shared`) that later phases build real functionality into, without also solving plumbing.              |
| EPIC-EX | Engineering Standards & Developer Experience | ✅ Done | State-management boundaries, test infrastructure (unit + e2e), a pre-commit quality gate, and written standards so "follow best practices" doesn't depend on remembering.           |
| EPIC-03 | Reconciliation Engine                        | ✅ Done | A deterministic, framework-free engine that turns settlement + ledger CSVs into matched transactions and typed exceptions, unit-tested against the real M-104 data.                 |
| EPIC-04 | Reconciliation API                           | ✅ Done | Merchant-scoped REST endpoints (summary, paginated exceptions, export) that serve the frontend directly — no reshaping needed on the client.                                        |
| EPIC-05 | Merchant Dashboard                           | ✅ Done | A merchant can see, in under 5 seconds, whether their settlements are healthy and what needs attention.                                                                             |
| EPIC-06 | Exception Investigation                      | ✅ Done | A merchant can open any exception and understand the discrepancy — settlement vs. ledger, difference, next step — without contacting support.                                       |
| EPIC-07 | Frontend Test Coverage                       | ✅ Done | The exceptions table (filter/sort/paginate/empty/error) has behavioral test coverage a reviewer can trust.                                                                          |
| EPIC-08 | AI-Assisted Explanations                     | ✅ Done | A merchant gets a plain-English explanation of an exception, generated from trusted structured facts, with a safe deterministic fallback.                                           |
| EPIC-09 | Accessibility Compliance                     | ✅ Done | The portal is usable end-to-end with keyboard only and via screen reader, verified against WCAG 2.1 AA, not just designed for it.                                                   |
| EPIC-10 | Stakeholder Communication                    | ✅ Done | The Head of Merchant Support understands what changed, what still needs them, and how success will be measured — without reading code.                                              |
| EPIC-11 | Submission Documentation                     | ✅ Done | A reviewer can understand and run the whole project in ~5 minutes from the README alone.                                                                                            |
| EPIC-12 | Engineering Quality Review                   | ✅ Done | A staff-engineer-level self-review catches what a real review would catch, before Rapyd's does.                                                                                     |
| EPIC-13 | Live Interview Readiness                     | ✅ Done | Every non-trivial decision in the repo has a prepared, honest, repo-grounded answer.                                                                                                |
| EPIC-14 | API Documentation & Access Control           | ✅ Done | The REST API is self-documenting via an interactive OpenAPI/Swagger UI, and that UI is not publicly exposed without credentials.                                                    |
| EPIC-15 | Dashboard Authentication                     | ✅ Done | A merchant must log in before reaching the dashboard or its data; merchant identity is resolved from that real session, not a hardcoded mock, without weakening merchant isolation. |
| EPIC-16 | Toolbar Redesign & Advanced Filtering        | ✅ Done | The exceptions toolbar matches a Kibana-style filter/sort/export/date-range pattern, the exception breakdown pills are clickable filters, and export supports CSV, Excel, and PDF.  |

## Notes on scope decisions

- EPIC-EX exists because "add Redux, set up proper testing, add a pre-commit hook, write coding
  standards" (this conversation's request) doesn't map to a single MASTER_PROMPT phase — it's
  infrastructure that supports every phase after it. Tracking it as its own epic keeps that work
  visible instead of silently folding it into EPIC-02's numbers after the fact.
- Epics are listed in delivery order, not by ID-then-priority — EPIC-EX sits where it was
  actually done (after EPIC-02, before EPIC-03) rather than being renumbered to the end.
- **EPIC-14, EPIC-15, and EPIC-16 are not part of `docs/prompts/MASTER_PROMPT.md`'s original
  13-phase plan.** All 13 phases were complete before any of them was added (2026-09-08, direct
  user requests: Swagger API docs with basic auth and a simple dashboard login for EPIC-14/15;
  a Kibana-style toolbar redesign with clickable exception pills, working filter/sort, and
  CSV/Excel/PDF export for EPIC-16). They're tracked the same way EPIC-EX was — as their own
  epics rather than folded into an existing "done" epic's numbers — so the fact that scope grew
  after the original plan finished stays visible rather than quietly rewriting history. See
  `docs/project-plan.md`'s notes for the same call-out.
