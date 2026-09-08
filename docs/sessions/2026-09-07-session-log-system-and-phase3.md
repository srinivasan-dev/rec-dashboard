# 2026-09-07 — Session-log memory system, then Phase 3: Reconciliation Engine

**Phases/epics touched:** meta (session-log system, not a MASTER_PROMPT phase); Phase 3
(Reconciliation Engine).
**Shipped:** see `CHANGELOG.md` "[Unreleased] — Session-log memory system" and
"[Phase 3] - 2026-09-07 - Reconciliation Engine".

## Decisions & why

- Built `docs/project-overview.md` + `docs/sessions/` as a lightweight, cross-referenced layer
  on top of the existing project-plan/CHANGELOG/backlog system, rather than replacing any of
  it — each file already had a clear job; the gap was specifically "why did we decide X," which
  none of them capture. See `docs/project-overview.md` itself for the full rationale.
- On starting Phase 3: found `packages/shared/src/{types,money,parsing,reconcile}.ts` already
  substantially implemented (edited ~20 minutes before this session picked up Phase 3, outside
  this conversation). Confirmed with the user this was their own in-progress work before
  touching it, then reviewed it line-by-line against `docs/prompts/MASTER_PROMPT.md`'s Phase 3
  spec rather than assuming it was correct or rewriting it. It matched the spec closely: all 6
  exception reasons, `merchantId + transactionId` composite key, integer-minor-units money,
  documented rule precedence, currency-grouped financial impact. Built on it rather than
  rewriting — see `docs/project-overview.md` "Reading order" for why that's the default move
  when unfamiliar working-tree state shows up.
- Jest + ts-jest for `packages/shared`'s tests, mirroring `apps/api`'s existing config exactly
  (same package versions were already hoisted in `node_modules`), rather than introducing a
  different runner for a third workspace.
- The M-104 manual-verification output (MASTER_PROMPT's explicit ask: "show me the resulting
  reconciliation output so I can manually verify it") was produced via a throwaway `tsx` script
  in the session scratchpad, not committed to the repo — it's a one-time verification step, not
  a permanent artifact. If the API/dashboard need to display this later, that's Phase 4/5's
  actual endpoint work, not a script to maintain in parallel.

## Direction changes / pivots

- `docs/project-overview.md`'s first draft stated the missing-ledger exception's financial
  impact as "1,533.31 AED." Running the real engine against the real CSVs showed that figure is
  actually **MISSING_LEDGER (1,384.66) + MISSING_SETTLEMENT (148.65) combined** — the AED total
  across both exceptions, not one exception alone. Corrected in the same session, before it
  could propagate. Lesson: a figure copied from a past bug-fix note is still worth re-deriving
  once the real code that produces it exists, rather than trusted indefinitely.

## Deferred / explicitly out of scope this session

None — Phase 3 was completed to its full stated scope (types, all 6 rules + precedence, 28 unit
tests, real-data verification).

## Missed / noticed but not fixed

- `CURRENCY_MISMATCH` is unit-tested but never triggered by the real M-104 data (expected — the
  MASTER_PROMPT explicitly asks for it to be evaluated defensively even though M-104 doesn't
  currently demonstrate it). Not a gap, just worth remembering it's synthetic-data-only coverage
  so far.

## Open questions for next session

None blocking. Phase 4 is ready to start.

## Resume point

- Next concrete action: Phase 4 — Backend API (`apps/api`): service layer wrapping
  `reconcileMerchant`, Zod-validated query params, the 5 endpoints
  (`summary`/`exceptions`/`exceptions/:id`/`exceptions/export`/`exceptions/:id/explanation`
  stub), merchant-isolation + pagination/filter integration tests.
- Minimum files to read first: `docs/architecture.md` §5 (API boundary) and §4 (merchant
  isolation), the Phase 4 section of `docs/prompts/MASTER_PROMPT.md` (exact endpoints, query
  params, pagination response shape, error codes), and `packages/shared/src/index.ts`'s exported
  surface (`reconcile`, `reconcileMerchant`, all types) — the API wraps this, it doesn't
  reimplement any reconciliation logic.
