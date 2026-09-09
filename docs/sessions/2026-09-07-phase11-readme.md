# 2026-09-07 — Phase 11: README

**Phases/epics touched:** Phase 11 (README).
**Shipped:** see `CHANGELOG.md` "[Phase 11] - 2026-09-07 - README".

## Decisions & why

- **Rewrote rather than incrementally edited the existing README.** The EPIC-EX-era version was
  explicitly a placeholder ("Status: in progress... This README will grow into the full
  submission README as those phases complete") describing a state (Phases 1-2 done, no dashboard,
  no reconciliation engine) that's been untrue since Phase 3. Patching it in place would have
  meant untangling which sentences were still accurate line by line; a fresh write against
  MASTER_PROMPT's explicit checklist, sourced from the current actual code, was faster and safer.
- **Linked out to the doc that owns each topic instead of duplicating it** — Architecture points
  to `docs/architecture.md`, Accessibility to `docs/accessibility.md`, AI design to
  `docs/ai-design.md`, Trade-offs to `docs/stakeholder-memo.md` for a non-technical version.
  Consistent with this repo's existing doc-map convention (`docs/project-overview.md`'s own
  table), and the only way to hit MASTER_PROMPT's "understand the project in ~5 minutes" target
  honestly — a README that inlined everything those docs already say would either bloat past five
  minutes or thin the source docs out to keep it short.
- **Every fact was pulled from the current code, not memory of what should be true.** API
  endpoints table cross-checked against `apps/api/src/routes/reconciliation.ts`; reconciliation
  rule ordering copied from `reconcile.ts`'s own doc comment (source of truth, not a paraphrase
  that could drift from it); sample-merchant figures matched against
  `apps/api/src/middleware/merchantContext.ts`'s actual hardcoded `M-104`; test count (103) taken
  from the last full suite run this session, not an earlier session's number.
- **"Production improvements" lists MASTER_PROMPT's exact given items, explicitly marked as not
  implemented** — per its own instruction ("do not pretend these were implemented"). Added one
  line of honest context per item (e.g., "today's pagination is in-memory array slicing, fine for
  CSV-sized data, not for a real merchant base") rather than a bare bullet list, since a Staff
  Engineer reviewer (Phase 12, next) would ask "why isn't this the real gap list" of a list with
  no context.
- **No screenshots embedded.** MASTER_PROMPT says "screenshots placeholder if appropriate" —
  judged it not appropriate to embed a _placeholder_ image (a broken-looking gray box) into a
  submission README; instead pointed at `docs/design/`'s real interactive prototype (which the
  shipped implementation matches closely, per the Design Implementation session) as the visual
  reference, and told the reviewer to just run it.

## Direction changes / pivots

None.

## Deferred / explicitly out of scope this session

- Nothing new — docs-only phase, no code changes.

## Missed / noticed but not fixed

- None.

## Open questions for next session

- None specific to the README.

## Resume point

- Next concrete action per `docs/project-plan.md`: **Phase 12 — Final Engineering Review**. Act
  as a Rapyd Staff Engineer reviewing the whole repository, score it across several dimensions
  (per MASTER_PROMPT's exact list, not yet fully read as of this session's end), and do a
  P0/P1/P2 fix pass -- explicitly instructed not to change code before finishing the inspection
  and scoring.
- Minimum files to read first: `docs/prompts/MASTER_PROMPT.md` Phase 12 section in full (the
  exact scoring dimensions and fix-pass process); this README (now the accurate front door to the
  whole project); `docs/project-overview.md`'s "Known open gaps" (a running list of everything
  already self-identified as incomplete, which a Staff Engineer pass should either confirm or
  find was missing items from).
