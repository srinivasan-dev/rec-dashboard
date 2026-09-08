# 2026-09-07 — Design Implementation (approved Phase 1 visual design applied)

**Phases/epics touched:** Cross-cutting (Phases 5-7's dashboard components + a UI-only sliver of
Phase 8). Not a MASTER_PROMPT-numbered phase — user-directed: "apply the CSS and other animation
effects and the functionalities" from `docs/design/Rapyd Settlement Reconciliation Final Design

- Interactive Prototype.html`.
**Shipped:** see `CHANGELOG.md` "[Design Implementation] - 2026-09-07".

## Decisions & why

- **Extracted design tokens from the prototype's own computed styles, not by eyeballing
  screenshots.** The prototype file is a self-contained exported artifact bundle (base64
  manifest + template, ~558KB, not readable as flat HTML/CSS). Rendered it with Playwright
  (`file://` URL) and read `getComputedStyle` on representative elements (colors, type scale,
  radii, spacing) plus screenshots of all 4 states (Populated/All Clear/Loading/Error, via the
  prototype's own state-toggle buttons) and the drawer's three tabs. This is why the applied
  colors/spacing match the design closely rather than approximately.
- **CSS Modules, not Tailwind/styled-components.** Checked first: `identity-obj-proxy` was
  already a devDependency and Jest's `moduleNameMapper` already had `.css` wired to it since
  Phase 2/EPIC-EX — CSS Modules was clearly the intended approach, just never exercised because
  nothing had styles yet. Used it rather than introducing a new styling dependency.
- **Kept every existing accessible control's DOM contract intact.** `FilterToolbar`'s
  `<select id="exceptions-reason-filter">` and the two date `<input>`s are unchanged elements/
  ids — Dashboard.test.tsx queries them by label text and would have broken on a rewrite (e.g. to
  clickable filter pills, which the design visually suggests). Chose to restyle the existing
  controls rather than change the filter interaction model. `ExceptionBreakdown`'s pills stay
  read-only for the same reason — adding click-to-filter would create a second source of truth
  for the same URL state and risked drift, for a design nuance that wasn't unambiguous in the
  first place (no visible "active" pill state was captured in the prototype's Populated
  screenshot).
- **`ExceptionDrawer` restructured into 3 tabs (Details / Settlement vs. Ledger / AI Explain),**
  matching the design exactly. Kept every string the Phase 6 tests already assert (title,
  transaction/amount/difference text, duplicate-entry rows, explanation + next-step copy) on the
  **default-active Details tab**, so none of that content is gated behind an extra click and no
  existing test needed to change. Settlement vs. Ledger and AI Explain are additive new panels.
- **Close button stays literally first in DOM order**, not the tabs — `useFocusTrap` moves focus
  to the first focusable descendant on open, and Phase 6's "moves focus into the drawer" test
  asserts that's the Close button. Its visual position (top-right, next to the title) comes from
  CSS `order` inside a shared flex header, not DOM position. Caught and fixed a real bug here:
  first attempt put Close and the title as _separate_ flex children of the whole drawer (not a
  shared header), so `order` reordered them against the tablist/body too and pushed both to the
  bottom of the drawer — order only applies among siblings in the same flex container.
- **Wired "AI Explain" to the real Phase 4 stub endpoint** (`POST .../explanation`) rather than
  leaving it as static mock content. The endpoint and its deterministic, calm, per-reason text
  already existed and were already integration-tested (Phase 4) — this is UI wiring to an
  existing contract, not new AI/backend work, and doesn't preempt Phase 8's actual provider
  design (which still needs to happen). Fetches lazily (`enabled` only once the tab opens), and
  the badge text is driven by the response's `generatedBy` field ("Auto-generated" for the
  current stub) rather than hardcoding "AI-generated" — didn't want to claim AI involvement that
  isn't real yet, given CLAUDE.md's correctness-over-polish standard for a payments product.
- **Left out the topbar's help/notification icon buttons and the drawer's "Download
  Receipt"/"Contact Support" footer buttons.** Same reasoning as the sidebar's inert nav items:
  no real functionality is defined anywhere in the docs for any of them (no support contact
  target, no receipt data model), and a button that does nothing is a worse accessibility outcome
  than not having the button.
- **Verified visually against the real running app**, not just the component tests — started
  both dev servers, drove the live dashboard with Playwright (populated, filtered, all 3 drawer
  tabs, zero console errors), and separately mocked the summary endpoint via Playwright route
  interception to force and screenshot the loading-skeleton, error, and all-clear states (the
  real M-104 data is always the same 5-exception populated state, so those three needed mocking
  to see live). All four states visually match the approved design closely.

## Direction changes / pivots

- Found and fixed a real bug mid-session (not present in the final diff): `ExceptionsTable`'s
  amber-vs-gray reason-pill styling used `data-severity="amount"|"structural"` in the component
  but the CSS selector checked for `data-severity="attention"` — a copy-paste mismatch from an
  earlier naming pass. Caught by comparing the live screenshot against the design (all pills
  rendered gray instead of the intended amber/gray split), not by a test, since no test asserts
  pill color. Fixed before completing this session.

## Deferred / explicitly out of scope this session

- Full responsive/mobile audit (already an open gap from Phase 5) — out of scope for a visual
  restyle of the desktop design; this pass only added a 2-column summary-card fallback as a side
  effect of using CSS grid.
- Making `ExceptionBreakdown` pills clickable filters — see reasoning above. Flagging as a
  legitimate follow-up if product confirms that's the intended interaction, not a rejected idea.
- Phase 8's actual `ExceptionExplanationProvider` / mock-vs-real-LLM design and
  `docs/ai-design.md` — the AI Explain tab is real UI wired to a real (stub) endpoint, but the
  provider abstraction itself is untouched. Phase 8 is still fully ahead of us.

## Missed / noticed but not fixed

- None this session beyond the pill-color bug above, which was fixed before completion.

## Open questions for next session

- Should the topbar icon buttons and drawer footer buttons (Download Receipt / Contact Support)
  be stubbed in with real destinations before submission, or is their omission fine for a
  take-home? Flagging, not deciding.
- Should `ExceptionBreakdown` pills become clickable filters (redundant with the `<select>`,
  matching the design's apparent intent more closely) or stay read-only? Flagging, not deciding.

## Resume point

- Per the standing plan, next concrete action is still **Phase 8 — LLM Explanation Feature**:
  define `ExceptionExplanationProvider` + `MockExplanationProvider` behind the same response
  contract the AI Explain tab now renders (`{ explanationText, generatedBy }`), and write
  `docs/ai-design.md`. The frontend side of "surface an explanation" is now done; Phase 8 is
  about what generates `explanationText` and `generatedBy` on the backend.
- Minimum files to read first: `apps/api/src/services/explanationStub.ts` (the contract to
  extend, not redesign), `apps/web/src/dashboard/ExceptionDrawer.tsx`'s `AiExplainPanel` (the
  consumer), `docs/prompts/MASTER_PROMPT.md` Phase 8 section.
