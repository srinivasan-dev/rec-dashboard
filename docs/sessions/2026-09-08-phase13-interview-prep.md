# 2026-09-08 — Phase 13: Live Interview Preparation

**Phases/epics touched:** Phase 13 (final phase of the 13-phase plan).
**Shipped:** see `CHANGELOG.md` "[Phase 13] - 2026-09-08 - Live Interview Preparation".

## Decisions & why

- **Stopped coding entirely**, per MASTER_PROMPT's own instruction for this phase ("Now stop
  coding... act as the Rapyd interviewer"). This phase produced only `docs/interview-prep/` — no
  source changes.
- **Put the deliverable in its own top-level folder** (`docs/interview-prep/`), per the user's
  explicit request, rather than a single file under `docs/`. Split into three files by purpose
  rather than one long document: `README.md` (index + how to use under pressure), `questions.md`
  (the 25 Q&A), `do-not-claim.md` (the honest gap list) — consistent with this repo's existing
  convention of small, purpose-scoped files over one large one.
- **Grounded every answer in a specific file/line/decision already in the repo**, not generic
  interview-prep boilerplate. Re-read `docs/architecture.md`, `docs/ai-design.md`,
  `packages/shared/src/reconcile.ts`, `money.ts`, and the Phase 12 review's own findings before
  writing, specifically so an answer like "why net amount not gross" cites the actual documented
  assumption (`docs/product-spec.md` assumption 4) rather than a plausible-sounding guess.
- **25 = MASTER_PROMPT's 20-question focus list + 5 more.** The 5 additions were chosen for being
  questions a sharp interviewer would ask about specific, defensible choices this repo actually
  makes that the standard list doesn't cover: the Jest-over-Vitest correction (a real
  brief-compliance decision made mid-build), the money-parsing mechanism (the single
  highest-stakes non-negotiable, worth a dedicated deep question beyond just "how do you avoid
  merchant leakage"), the API-boundary rationale (why the frontend can't call the engine
  directly), and a full narration of the Phase 9 focus-trap bug (the single most concrete,
  provable "I found and fixed a real bug" story available in this repo).
- **`do-not-claim.md` is a repeat, not a new discovery.** Every item in it already exists in
  `docs/project-overview.md`'s "Known open gaps" or `docs/accessibility.md`'s "Deliberately not
  done" — the value of restating them here is framing: each one is written as "if asked X, say Y
  honestly," which is a different and more directly usable shape than a gaps list written for
  future engineering work.

## Direction changes / pivots

None.

## Deferred / explicitly out of scope this session

- Nothing new — this phase's own scope was Q&A prep, not implementation. All previously-deferred
  engineering gaps (see `do-not-claim.md`) remain exactly as open as they were after Phase 12.

## Missed / noticed but not fixed

- None — no code was touched this phase, per MASTER_PROMPT's instruction.

## Open questions for next session

- None. This is the last of the 13 planned phases; `docs/project-plan.md` now shows all 13 as
  done. Any further work is either a real live interview (using `docs/interview-prep/`) or one of
  the still-open, self-identified gaps this and prior sessions have tracked.

## Resume point

- There is no next MASTER_PROMPT phase. If work continues, it would be either preparing live for
  an actual interview (read `docs/interview-prep/README.md` first) or picking an item off
  `docs/project-overview.md`'s "Known open gaps" / `docs/interview-prep/do-not-claim.md` to
  actually close before submission — the responsive/mobile audit and per-journey e2e specs are
  the two most consequential ones per this session's own prioritization (see `questions.md` Q21).
