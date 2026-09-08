# 2026-09-06 — Phase 1: Product Thinking & UX

_(Reconstructed from `CHANGELOG.md` and `docs/product-spec.md` — see the note in
`docs/sessions/README.md`.)_

**Phases/epics touched:** Phase 1 (Product Thinking & UX).
**Shipped:** see `CHANGELOG.md` "[Phase 1] - 2026-09-07 - Product Thinking & UX".

## Decisions & why

- Exception language is calm ("needs review") never alarming ("money is missing"), unless the
  data actually proves loss — protects the merchant from false alarm and Rapyd from implied
  liability. Baked into `docs/product-spec.md` §9 and `CLAUDE.md`'s non-negotiables.
- "All clear" is designed as a positive success state, not an empty-table afterthought — most
  merchants most days will have zero exceptions, and that should feel like a win.
- Reconciliation match key is `merchantId + transactionId` composite, not `transactionId` alone,
  because transaction IDs aren't assumed globally unique across merchants (`docs/product-spec.md`
  §14, assumption 3). This is a Phase 3 engine constraint decided here, ahead of the engine
  existing.
- Net amount (post-fees) is the reconciliation target, since that's what the merchant actually
  receives (assumption 4) — not gross settlement amount.
- Wireframes and mockups were grounded in the actual M-104 exceptions from `data/` (T1006,
  T1013, T1054, T1008, T1045) rather than invented example data.

## Direction changes / pivots

None recorded for this session.

## Deferred / explicitly out of scope this session

- Charts/visualizations, trend analysis, real-time webhooks, dispute workflows, visual design
  refinement — see `docs/product-spec.md` §16 Product Trade-Off.
- Multi-currency aggregation into a single total — deliberately never done; always group by
  currency (§15 risk mitigation).

## Missed / noticed but not fixed

Self-review (from the persona of Rapyd's Head of Merchant Support, `docs/product-spec.md`
Appendix) flagged three gaps that were **not** resolved in this session and are still open:

- No data-freshness indicator ("data as of" timestamp) — considered the most likely support
  escalation gap.
- Export scope unclear — exceptions-only vs. exceptions + matched transactions.
- Duplicate-entry exception explanation doesn't show which two ledger rows are the duplicates,
  undermining self-service verification.

## Open questions for next session

- (Carried forward — see `docs/project-overview.md` "Known open threads.")

## Resume point

- Next concrete action (as executed): Phase 2 — repository scaffold and architecture.
- Minimum files to read first: `docs/product-spec.md` §§3-9 (journeys, IA, UX states, exception
  language) before touching Phase 5/6 dashboard work; §14-15 (assumptions/risks) before Phase 3
  or Phase 4.
