## What & why

<!-- What changed, and the reason — link the relevant epic/story from docs/backlog/ if applicable. -->

## Phase / Epic

<!-- e.g. Phase 3 / EPIC-03 — Reconciliation Engine -->

## How it was tested

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run test:e2e` passes (if frontend behavior changed)
- [ ] Manually verified against `data/` (M-104) where relevant

## Checklist

- [ ] No merchant data leakage — cross-merchant access paths considered
- [ ] No `any`, no floating-point money math
- [ ] Accessibility: keyboard-operable, no color-only status (if UI changed)
- [ ] Relevant docs updated (`docs/architecture.md`, `docs/product-spec.md`,
      `docs/backlog/`, `CHANGELOG.md`) if this changes a decision or adds scope
