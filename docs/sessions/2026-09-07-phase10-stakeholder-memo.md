# 2026-09-07 — Phase 10: Stakeholder Memo

**Phases/epics touched:** Phase 10 (Stakeholder Memo).
**Shipped:** see `CHANGELOG.md` "[Phase 10] - 2026-09-07 - Stakeholder Memo".

## Decisions & why

- **Wrote it as an actual memo to a non-technical reader, not a re-skinned engineering doc.**
  MASTER_PROMPT's Phase 10 explicitly says "do NOT write this like an engineering architecture
  document" — every other doc in this repo is written for the next engineer (this one, or a
  future session), so this required a genuine register shift: no framework names, no "API,"
  no "deterministic engine," no test counts. Read it back afterward specifically checking for
  jargon that had slipped in from writing everything else in this repo in engineering voice.
- **Reused `docs/product-spec.md`'s existing trade-off (§16) and metric methodology (§13) as
  source material, but did not copy them verbatim.** Both were written in Phase 1's engineering-
  facing voice and, in the trade-off's case, are now slightly stale: §16 lists "visual polish" as
  something deferred, but the Design Implementation session since shipped the full approved
  visual design. Rewrote the trade-off to reflect what's _actually_ still deferred as of today
  (trend charts, real-time ingestion, in-portal dispute workflow) rather than reproducing a
  Phase-1 statement that no longer matches current state.
- **Section 2 ("what still requires support") is deliberately concrete, not a general
  disclaimer.** MASTER_PROMPT calls out "do not imply the portal automatically fixes settlement
  discrepancies" as something to explicitly avoid — the memo names specific cases (an
  unmatched settlement, a duplicate ledger entry, a disputed transaction) and says plainly that
  removing a duplicate or adjudicating a dispute is a support action, not a portal action, rather
  than a single hedge-y sentence that could be read as covering for gaps.
- **The AI section describes grounding and fallback behavior without using the words "provider,"
  "context object," or "hallucination."** Translated Phase 8's actual guarantees
  (`docs/ai-design.md`) into plain language: the explanation only describes numbers already on
  screen, it can't speculate about fraud/liability, and a failure or bad output is invisible to
  the merchant because they get a standard explanation instead. This is the same guarantee
  `docs/ai-design.md` documents technically — just told to an operations audience instead of an
  engineering one.
- **Trimmed for length after a first draft ran to ~740 words** (MASTER_PROMPT: "maximum about one
  page"). Cut restated points and combined sentences rather than dropping any of the five
  required sections — final draft is ~580 words, all five sections intact.

## Direction changes / pivots

None.

## Deferred / explicitly out of scope this session

- Nothing new — this phase produced one document with no code changes, so there's no separate
  deferred-implementation list the way code-touching phases have had.

## Missed / noticed but not fixed

- None.

## Open questions for next session

- None specific to this memo.

## Resume point

- Next concrete action per `docs/project-plan.md`: **Phase 11 — README**. The repo currently has
  a scoped, in-progress root `README.md` (from EPIC-EX) — Phase 11 replaces it with the full
  version MASTER_PROMPT's section specifies (exact contents not yet read as of this session's
  end).
- Minimum files to read first: `docs/prompts/MASTER_PROMPT.md` Phase 11 section; the current root
  `README.md` (to see what's already there vs. what needs adding, not rewriting from scratch);
  `docs/project-overview.md`'s doc-map table (README should likely link out to the other docs
  rather than duplicate their content, consistent with how every other doc in this repo behaves).
