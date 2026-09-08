# Accessibility Review

Phase 9 deliverable per `docs/prompts/MASTER_PROMPT.md`: a dedicated review against the
checklist it specifies, against the WCAG 2.1 AA baseline `docs/product-spec.md` §12 already
committed to. This document records what was checked, what was already correct, what was
substantively wrong and fixed, and what was deliberately left alone.

## How this was reviewed

Not a code-reading exercise alone. Three methods, in order:

1. **Read every component** against the checklist below.
2. **Computed the actual WCAG contrast ratios** for every color token pair in use (see §5) —
   contrast is a number, not a visual impression, so this was calculated, not eyeballed.
3. **Drove the real running app with Playwright**, tabbing through the entire page and the
   drawer's full focus cycle and logging exactly what received focus at each step. This is what
   caught the one serious bug in this review (§4) — it was invisible from reading the code, and
   invisible to the existing test suite too, because nothing had ever exercised a _complete_ Tab
   cycle all the way around the trap back to its start.

## 1. Semantic structure & landmarks — already correct

`<main>` (page content, exactly one), `<nav>` (sidebar, `aria-label="Client portal sections"`,
and the table's own `<nav aria-label="Exceptions pagination">`), `<aside>` (sidebar container),
`<header>` (topbar — a true "banner" landmark since it isn't nested inside `main`/`article`/etc.;
`Dashboard`'s own `<header>` for the page title row is nested inside `<main>`, so it's correctly
_not_ exposed as a second banner landmark — both were already right, just worth confirming the
reasoning holds).

## 2. Heading order — fixed

**Before this review, the entire page had exactly one heading** (`<h1>Settlement
Reconciliation</h1>`) despite `docs/product-spec.md` §12 explicitly committing to "h1 page title,
h2 sections." Section labels like "Exception breakdown" were styled to _look_ like headings
(small-caps, muted color) but were plain `<p>` tags — invisible to a screen reader user jumping
between sections by heading (a primary navigation technique, not an edge case). Fixed:

- `ExceptionBreakdown`'s label is now a real `<h2>` (zero visual change — same CSS class).
- A visually-hidden `<h2>Summary</h2>` now precedes the status banner + summary cards region, so
  it has a heading to jump to as well.
- Inside the drawer: `<h3>Side-by-side comparison</h3>` and `<h3>Explanation</h3>` (was `<p>`/
  `<span>`), nested correctly under the drawer's own `<h2>` (the exception title).

Resulting outline is sequential with no skipped levels: h1 → h2 Summary → h2 Exception breakdown
→ (h2 exception title, only while the drawer is open) → h3 Side-by-side comparison / h3
Explanation.

## 3. Non-text content read by screen readers — fixed

Every icon+text status indicator (✓/! in `StatusBanner`, pills, etc.) was already built to never
rely on color alone (§9 below), but several **decorative glyphs were not marked `aria-hidden`**,
so they'd be read aloud alongside the text they decorate — "star AI Explain" instead of
"AI Explain", "black circle Needs review" instead of "Needs review." Fixed in the drawer: the
sparkle on the "AI Explain" tab and the "Explanation" heading, and the bullet on the "Needs
review" pill, are now wrapped in `aria-hidden` spans, matching the pattern `StatusBanner` already
used correctly for its own icon.

The sidebar's inert nav items (`Home`, `Collect`, `Disburse`, …) were reviewed again here too:
they're plain, non-interactive `<li>` text (converted from `<span>`s — see §6), not links to
nowhere. A link with no destination is a worse screen-reader experience than honest static text,
and nothing in `docs/product-spec.md` scopes those as real pages.

## 4. Keyboard navigation, focus order, drawer focus handling — one real bug found and fixed

This is the substantive finding of this review.

**The bug:** `useFocusTrap.ts` computes "first" and "last" focusable element inside the drawer by
`querySelectorAll` against a selector that includes `[tabindex]:not([tabindex="-1"])`. Every tab
panel carries `tabIndex={0}` for keyboard accessibility — including the two _inactive_ panels,
which are `hidden`. `querySelectorAll` matches hidden elements just fine (it doesn't know or care
about rendering), so the trap's "last" element was frequently a hidden panel that a real Tab
keypress could never actually land on. Since the wrap-to-first logic only fires when
`document.activeElement === last`, and a hidden element can never become `document.activeElement`
via real keyboard navigation, **that condition could never be true** — Tab from the last
_reachable_ element fell through to the browser's native behavior and escaped the dialog
entirely, landing on whatever came after the drawer in the page (e.g. the "Export CSV" button in
the background).

This existed from the moment tabs (with hidden inactive panels) were added to the drawer, and
went undetected because:

- Every existing focus test checked a _single_ focus transition (open → focus lands on Close;
  close → focus returns to trigger) — none of them Tab all the way around the loop.
- It's invisible from reading the component code in isolation; you have to know that
  `querySelectorAll` doesn't filter by visibility to suspect it.
- It was caught here specifically by driving the real app with Playwright and logging
  `document.activeElement` at every Tab press — the one method in this review that isn't "read
  the code and reason about it."

**The fix:** `useFocusTrap.ts` now filters both the "first" and "last" calculations through
`isReachable()` — `element.closest('[hidden]') === null` — before picking first/last. This is
checked via the `hidden` attribute directly rather than a layout-based check like
`offsetParent === null`, deliberately, because jsdom (the test environment) doesn't compute
layout and would report every element as "not rendered" — the `hidden`-attribute check behaves
identically under Jest and in a real browser.

**Regression test added**: `ExceptionDrawer.test.tsx`'s `wraps Tab back to Close after cycling
through every reachable element, never escaping to the page behind it` — Tabs through Close → all
3 tabs → the visible panel → one more Tab, and asserts focus is back on Close, not on a button
placed outside the drawer in the test harness. Verified this test actually fails without the fix
(reverted `isReachable` to always return `true`, confirmed the test failed with focus landing on
`<body>`, then restored the fix) — not just that it passes, that it _would have caught this_.

Everything else in this area was already correct: sortable table headers are real `<button>`s
(not click handlers on `<div>`s), row actions are real `<button>`s with descriptive `aria-label`s,
pagination Previous/Next use the native `disabled` attribute at boundaries, and Escape/focus-
return both already worked (and still do — this bug was specifically about Tab cycling past the
_last_ element, a different code path).

## 5. Color contrast — two token values fixed, rest verified passing

Computed exact WCAG contrast ratios (not estimated) for every text/background and border/
background pair actually in use:

| Pair                                                                                | Ratio       | Verdict                            |
| ----------------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| muted text `#9CA3AF` on white (**as extracted from the approved design prototype**) | 2.54:1      | **Fails** AA (needs 4.5:1)         |
| form control border `#D1D5DB` (**as extracted from the prototype**) on white        | 1.47:1      | **Fails** AA (needs 3:1, non-text) |
| body text `#1A1D21` on white                                                        | 16.91:1     | Pass                               |
| secondary text `#6B7280` on white                                                   | 4.83:1      | Pass                               |
| brand purple `#5C2D91` on white (links, active tab, button text)                    | 9.38:1      | Pass                               |
| positive text `#166534` on its tint background                                      | 6.81:1      | Pass                               |
| attention text `#92400E` on its pill/banner backgrounds                             | 6.37–7.09:1 | Pass                               |
| neutral pill text `#374151` on its pill background                                  | 9.37:1      | Pass                               |
| error text `#B91C1C` on error background                                            | 5.91:1      | Pass                               |
| info text `#1D4ED8` on info background                                              | 6.16:1      | Pass                               |
| AI-panel text `#5B21B6` on its tint background                                      | 8.19:1      | Pass                               |

The two failing values were both taken directly from the approved Phase 1 design prototype's own
computed styles (see the Design Implementation session log) — an inherited design flaw, not
something introduced during implementation. Both are fixed as **single-line token changes** in
`apps/web/src/styles/tokens.css`, with no component file touched, since every component already
reads color through the token layer:

- `--color-text-muted` is now aliased to `--color-text-secondary` (`#6B7280`, 4.83:1) instead of
  its own failing shade — every current use of this token is real label text a merchant needs to
  read (card labels, table headers, field labels), not decoration, so there was no case where
  keeping the lighter, failing shade was defensible.
- `--color-border-strong` (used for input/select/secondary-button borders) is darkened from
  `#D1D5DB` to `#84909F` — the lightest shade found that still clears 3:1 non-text contrast,
  chosen to stay as close to the original design intent as the compliance floor allows.

This is a deliberate, documented deviation from literal prototype-color fidelity. Accessibility
compliance — an explicit `docs/product-spec.md` §12 commitment — takes priority over matching a
mockup's exact hex values when the two conflict.

## 6. Semantic lists & other structural touch-ups

`AppShell`'s sidebar nav items were a flat run of `<span>`s inside a `<nav>` with no list
semantics. Converted to a proper `<ul>`/`<li>` structure — free (no visual change, `list-style:
none` in CSS) and gives screen reader users an accurate "list of N items" announcement instead of
undifferentiated inline text.

Added a `<caption>` to the drawer's new "Settlement vs. Ledger" comparison table (visually
hidden, matching the pattern the main exceptions table already used) — every table now has an
accessible name a screen reader announces when landing on it, not just the one that existed
before this review.

## 7. Everything else on the MASTER_PROMPT checklist — reviewed, already correct

- **Form labels** — every input/select in `FilterToolbar` has a real `<label htmlFor>` (the two
  date inputs use visually-hidden individual labels under one shared visible "Date range" caption
  — each control still has its own accessible name).
- **Table headers** — `<th scope="col">` throughout, both tables.
- **Error announcements** — `role="alert"` on every error state (page-level, table-level, drawer-
  level, AI-explain-level).
- **Loading announcements** — `aria-live="polite"` on every loading region.
- **Status semantics** — `role="status"` on `StatusBanner`.
- **Non-color status indicators** — icon + text everywhere (✓/! banner, text-labeled pills, a
  "Difference" text label next to the red amount, never color alone).
- **Focus visibility** — a single global `:focus-visible` rule (`global.css`) applies to every
  interactive element with no component overriding it away (checked — grepped the whole
  component-CSS tree for `outline`, found only that one definition). Purple outline against every
  background in use clears 3:1 non-text contrast easily (9.38:1 against white, the lightest
  background it ever appears on).

## Deliberately not done

- **`inert` on background content while the drawer is open.** `aria-modal="true"` is already the
  ARIA-recommended signal, and well-behaved screen readers already respect it without needing the
  rest of the page manually hidden. Adding `inert` as belt-and-suspenders would be marginal
  robustness for meaningfully more code — MASTER_PROMPT explicitly says not to introduce
  complicated abstractions unnecessarily, and this is exactly that trade-off.
- **Roving `tabindex` on the drawer's tabs** (the more "by-the-book" WAI-ARIA tabs pattern, where
  only the active tab is in the Tab sequence and arrow keys move between them). All three tabs
  are currently individually Tab-reachable, with arrow-key support added on top as an
  enhancement. This isn't a WCAG failure (2.1.1 Keyboard is satisfied either way) — it was a
  deliberate choice made while first building the tabs, to avoid interacting with the
  `FOCUSABLE_SELECTOR` matching-hidden-elements behavior this same review ended up finding and
  fixing anyway. Worth revisiting now that the underlying issue is fixed, but not done in this
  pass to keep the fix scoped to what was actually reviewed.

## Three most important decisions (interview-ready)

1. **The focus-trap bug was found by driving the real app, not by reading code or trusting
   existing tests.** Every existing automated test checked one focus _transition_ in isolation;
   none of them completed a full Tab cycle back to its starting point. Reading `useFocusTrap.ts`
   in isolation looks correct — the bug only exists because `querySelectorAll` doesn't know or
   care whether an element is actually rendered, which isn't obvious without testing the real
   interaction. The fix took four lines; finding it took choosing the right verification method.
2. **Two color tokens inherited from the approved design prototype failed WCAG AA, and fixing
   them meant deviating from the mockup's exact hex values.** Contrast is measurable, not a
   matter of taste — `#9CA3AF` at 2.5:1 fails regardless of how it looks. Given
   `docs/product-spec.md` §12 already committed this build to WCAG 2.1 AA, that commitment had to
   win over literal fidelity to a mockup that predates the commitment being checked against real
   numbers.
3. **Headings are navigation infrastructure, not visual styling — a screen reader user jumping by
   heading had exactly one stop on the entire page before this review**, despite the page visibly
   having several distinct sections styled to look like they had headings. The fix was often
   swapping a `<p>` for an `<h2>` with the identical CSS class already applied to it — zero visual
   cost, meaningful navigation gain, which is the general shape of most of the real accessibility
   work in this review: cheap to fix once found, invisible until specifically looked for.
