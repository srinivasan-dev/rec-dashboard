# Project instructions

This is a phase-by-phase take-home build for Rapyd's Client Portal Engineer role — a merchant
settlement reconciliation portal. **Read [docs/project-overview.md](docs/project-overview.md)
first** — it's the fast-orientation entry point and says what order to read everything else in,
including the last 1-2 entries of [docs/sessions/](docs/sessions/) (what was decided, changed,
deferred, or missed last session — read those before re-deriving anything). Then, before writing
any code in this repo:

- **[docs/prompts/MASTER_PROMPT.md](docs/prompts/MASTER_PROMPT.md)** — the 13-phase build plan.
  Work phase by phase; don't build ahead of the current phase's scope (each phase states what
  NOT to build yet, and that's deliberate).
- **[docs/product-spec.md](docs/product-spec.md)** — product requirements, UX states, exception
  language, accessibility commitment. The source of truth for _what_ to build.
- **[docs/architecture.md](docs/architecture.md)** — system architecture and the reasoning
  behind it. The source of truth for _how_ it's structured.
- **[docs/project-plan.md](docs/project-plan.md)** — phase status tracker.
- **[docs/backlog/](docs/backlog/)** — Epics → User Stories → Tasks, for anyone (including
  future-you) tracking end-to-end ownership of this build.

Before ending a session (or at a natural pause), add or update an entry in
[docs/sessions/](docs/sessions/README.md) — decisions made, direction changes, anything deferred
or noticed-but-not-fixed, and where to resume. That's what lets the next session skip re-reading
and re-deriving this one's context.

## Non-negotiables

- **Merchant isolation.** Every query is scoped by the authenticated `merchantId`, set by
  server-side middleware — never trust a client-supplied merchant ID. See
  `docs/architecture.md` §4.
- **Money is never a float.** Parse CSV decimal strings into integer minor units once, at the
  boundary; do all arithmetic and comparison in that integer domain. See `docs/architecture.md`
  §8.
- **The LLM never decides reconciliation.** Deterministic code determines whether an exception
  exists, its reason, and its amounts. An LLM (or the mock standing in for one) only turns
  already-decided facts into merchant-friendly prose. Ship with a deterministic fallback for
  when it fails or produces something unusable.
- **Exception language is calm, not alarming.** "Needs review," never "money is missing" or
  "lost," unless the data actually proves it. See `docs/product-spec.md` §9.
- **Every data view has 4 states**: loading, all-clear, error, populated. "All clear" is a
  positive success state, not an empty-table afterthought.

## Stack-specific standards

Full detail lives in per-stack docs — read the relevant one before writing code in that layer:

- **[docs/standards/backend-standards.md](docs/standards/backend-standards.md)** — Node/Express/
  TypeScript conventions for `apps/api` and `packages/shared`.
- **[docs/standards/frontend-standards.md](docs/standards/frontend-standards.md)** — React/
  TypeScript conventions for `apps/web`, including the exact boundary between TanStack Query,
  Redux, and URL state.

## Before you commit

- A **pre-commit** hook (Husky + lint-staged) runs ESLint + Prettier on staged files and a full
  `typecheck` automatically.
- A **commit-msg** hook (commitlint) enforces [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, …) — write commit messages in that
  format or the commit is rejected.
- See `docs/standards/backend-standards.md` / `frontend-standards.md` "Testing" sections for
  what to run manually before opening a PR (full test suite, e2e where relevant) — hooks are a
  fast local gate, not a substitute for CI.
- **CI** (`.github/workflows/ci.yml`) runs lint, typecheck, all unit tests, the build, and the
  e2e suite on every push and PR — the same checks as local hooks plus e2e, as the actual gate
  before merge.

## Working with Claude in this repo

- **Don't modify test files, run the test suite, or run a regression pass (Jest/Playwright/
  lint/typecheck) after a change unless explicitly asked.** Regression runs are slow; assume the
  user will ask for one by name (or a PR/commit is imminent) when they want it. This overrides
  the general "test before reporting done" instinct for routine, incremental changes in this repo.

## When in doubt

Prefer the boring, explicit, testable option over the clever one. This is a reconciliation
product for a payments company — correctness and auditability beat elegance every time there's
a conflict between them.
