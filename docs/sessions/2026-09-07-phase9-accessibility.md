# 2026-09-07 — Phase 9: Accessibility Review

**Phases/epics touched:** Phase 9 (Accessibility Review).
**Shipped:** see `CHANGELOG.md` "[Phase 9] - 2026-09-07 - Accessibility Review".

## Decisions & why

- **Reviewed via three methods, not one.** Read every component against MASTER_PROMPT's
  checklist; computed exact WCAG contrast ratios for every color pair in use with a small script
  rather than eyeballing them; and drove the real running app with Playwright, logging
  `document.activeElement` at every Tab press through the full page and the drawer's complete
  focus cycle. The third method is what caught the real bug (below) — it was invisible to the
  first two.
- **Found a genuine focus-trap escape bug, not a hypothetical one.** Tabbing all the way through
  the drawer's tabs and into the visible panel, one more Tab escaped the dialog entirely and
  landed on a button in the background page, instead of wrapping back to Close. Root cause:
  `useFocusTrap.ts`'s "last focusable element" calculation used `querySelectorAll` against a
  selector that matches `[tabindex]:not([tabindex="-1"])` — which matches the drawer's _hidden_
  tab panels too (they carry `tabIndex={0}` for keyboard access when active), since
  `querySelectorAll` doesn't know or care about rendering. A hidden element can never actually
  become `document.activeElement` via real Tab navigation, so the trap's wrap-to-first condition
  (`activeElement === last`) could never fire once "last" was a hidden panel. This bug existed
  from the moment the Design Implementation session added tabs with hidden inactive panels, and
  went undetected through that session's own test additions because every focus test checked a
  single transition (open → focus on Close; close → focus returns to trigger), never a _complete_
  Tab cycle back to the start.
- **Fixed via a `hidden`-attribute check, deliberately not a layout-based one.** The obvious fix
  is "filter out elements that aren't actually visible" — the standard technique for that is
  `element.offsetParent !== null`. Checked first whether that would work under Jest: it wouldn't
  — jsdom doesn't compute layout, so `offsetParent` is `null` for every element unconditionally,
  which would have broken the _entire_ existing focus-trap test suite (nothing would ever be
  found "rendered"). Used `element.closest('[hidden]') === null` instead — pure DOM-tree
  matching, no layout required, works identically in jsdom and a real browser.
- **Verified the regression test actually catches the bug, not just that it passes.** Wrote the
  new test, ran it (passed), then deliberately reverted the fix (`isReachable` returns `true`
  unconditionally), reran the same test, confirmed it failed with focus landing on `<body>`
  (reproducing the exact live-browser symptom), then restored the fix. This is the same discipline
  applied to the Phase 8 fallback tests and the Phase 6 flaky-test root-cause — a test that has
  never been observed to fail is an unverified test, not a passing one.
- **Two color tokens fixed as a single-line change each, no component file touched.** Both
  `--color-text-muted` and `--color-border-strong` failed their respective WCAG AA minimums
  (2.54:1 vs. 4.5:1 required; 1.47:1 vs. 3:1 required) — both inherited directly from the approved
  design prototype's own computed styles, not introduced during implementation. Because every
  component already reads color exclusively through the token layer (a Design Implementation
  session decision), fixing the _value_ in `tokens.css` fixed every consumer at once. Chose to
  alias `--color-text-muted` to the already-passing `--color-text-secondary` rather than invent a
  third near-duplicate gray, since the minimum darkening that clears 4.5:1 (`#6E7689`, 4.55:1) is
  close enough to `--color-text-secondary` (`#6B7280`, 4.83:1) that a separate token would be a
  distinction without a visual difference.
- **Promoted several `<p>`/`<span>` "section labels" to real headings** — the whole page had
  exactly one heading (`<h1>`) before this review, despite `docs/product-spec.md` §12 committing
  to "h1 page title, h2 sections." Every fix here was swapping the element type onto an existing
  CSS class, so there's zero visual change; the fix is entirely about giving screen reader users
  (who navigate by heading, not by visual styling) the section jump-points a sighted user already
  gets for free from the visual hierarchy.
- **Decorative glyphs (✦, ●) wrapped in `aria-hidden` spans** in the drawer, matching the pattern
  `StatusBanner` already used correctly for its own icon — these were baked directly into visible
  text content elsewhere, so a screen reader would announce "star AI Explain" instead of
  "AI Explain."
- **Did not add `inert` to background content while the drawer is open, and did not switch the
  drawer's tabs to a roving-tabindex pattern.** Both are legitimate "more correct" refinements,
  but neither fixes a WCAG failure — `aria-modal="true"` already signals modality correctly to
  well-behaved AT, and all three tabs being individually Tab-reachable (rather than only the
  active one) doesn't fail keyboard-operability, it's just not the most by-the-book ARIA authoring
  pattern. MASTER_PROMPT explicitly says not to introduce complicated abstractions unnecessarily;
  logged both as considered-but-not-done in `docs/accessibility.md` rather than silently skipping
  them.

## Direction changes / pivots

None — this was a dedicated review phase per the standing plan, not a pivot from a prior
decision. The focus-trap bug was a genuine discovery, not a planned deliverable, but fixing
substantive issues found during the review is exactly what MASTER_PROMPT's Phase 9 asks for.

## Deferred / explicitly out of scope this session

- **Roving tabindex for the drawer tabs** — see "Decisions & why" above and
  `docs/accessibility.md`'s "Deliberately not done." Flagged as worth revisiting, not done here.
- **`inert` on background content during the modal** — same reasoning; `aria-modal="true"` is
  already the correct signal for compliant assistive tech.

## Missed / noticed but not fixed

- None — every substantive issue found this session was fixed before completion.

## Open questions for next session

- None specific to accessibility. The general "should X gap be closed before submission" flags
  (roving tabindex, `inert`) are recorded in `docs/project-overview.md`'s open-gaps list for the
  user to decide, not technical blockers for the next phase.

## Resume point

- Next concrete action per `docs/project-plan.md`: **Phase 10 — Stakeholder Memo**. A written
  memo (audience, format, and content per whatever MASTER_PROMPT's Phase 10 section specifies —
  not yet read in detail as of this session's end).
- Minimum files to read first: `docs/prompts/MASTER_PROMPT.md` Phase 10 section; `docs/product-
spec.md` §16-17 (trade-offs and success criteria — likely source material for a stakeholder-
  facing memo); `docs/project-overview.md`'s "Known open gaps" (things a stakeholder memo should
  probably surface honestly rather than omit).
