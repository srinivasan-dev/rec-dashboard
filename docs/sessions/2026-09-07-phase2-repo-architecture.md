# 2026-09-07 — Phase 2: Repository & Architecture

_(Reconstructed from `CHANGELOG.md` and `docs/architecture.md` — see the note in
`docs/sessions/README.md`.)_

**Phases/epics touched:** Phase 2 (Repository & Architecture).
**Shipped:** see `CHANGELOG.md` "[Phase 2] - 2026-09-07 - Repository & Architecture".

## Decisions & why

- **npm workspaces**, not Nx/Turborepo — three packages, no need for remote caching or an
  affected-graph build system; that tooling would be unjustified complexity here
  (`docs/architecture.md` §9).
- **Express app factory pattern**: `createApp()` separated from the listener (`index.ts`)
  specifically for testability (Supertest can exercise the app without binding a port).
- **`attachMerchantContext` middleware** hardcodes `merchantId = M-104`, standing in for a real
  auth/session system — this is the seam a real auth layer would replace later, and every
  downstream query must read the merchant ID from this middleware, never from a client-supplied
  value (`CLAUDE.md` non-negotiable, `docs/architecture.md` §4).
- Monetary precision strategy fixed here even though no money-handling code exists yet: CSV
  decimal strings parse **once**, at the boundary, into integer minor units; all arithmetic and
  comparison happens in that integer domain; conversion back to decimal string happens only at
  the presentation edge (§8). This governs all of Phase 3's engine design.
- Engine error-handling philosophy set here: a missing ledger row etc. is an expected outcome
  (`ReconciliationException`), not a thrown error — the engine only throws for genuine
  programmer errors (§7).

## Direction changes / pivots

- `apps/web` was originally scaffolded with **Vitest** for unit tests in this phase. That was
  reversed in the very next session (EPIC-EX) after re-auditing the assessment brief — see
  `docs/sessions/2026-09-07-epic-ex-engineering-standards.md`. If you're wondering why the repo
  has Jest instead of the more Vite-native Vitest, that's why — it wasn't the original choice.

## Deferred / explicitly out of scope this session

- No reconciliation logic — `packages/shared` was scaffolded empty (framework-free), deliberately
  left for Phase 3. This is the kind of "phase boundary" `docs/project-plan.md` calls out
  explicitly: Phase 2 is tooling/structure only.
- No Zod validation yet — placeholder until Phase 4 (API).
- No real dashboard — `apps/web` renders a placeholder shell only.

## Missed / noticed but not fixed

None recorded for this session.

## Open questions for next session

None recorded for this session — carried into EPIC-EX and Phase 3 without new questions raised
here.

## Resume point

- Next concrete action (as executed): EPIC-EX — engineering standards & DX hardening, before
  starting Phase 3.
- Minimum files to read first: `docs/architecture.md` in full before starting Phase 3 (the
  reconciliation boundary, merchant isolation, and monetary precision sections directly govern
  the engine's design) or Phase 4 (the API boundary and error handling sections).
