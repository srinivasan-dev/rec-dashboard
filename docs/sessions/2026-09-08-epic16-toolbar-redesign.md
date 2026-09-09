# 2026-09-08 — EPIC-16: Toolbar Redesign & Advanced Filtering

**Phases/epics touched:** EPIC-16 (planning + implementation, single session).
**Shipped:** see `CHANGELOG.md` "[EPIC-16] - 2026-09-08 - Toolbar Redesign & Advanced Filtering".

## Decisions & why

- **Asked before implementing, rather than guessing:** export format(s) to support, whether this
  was big enough to warrant its own backlog epic, and the approach for the date range picker.
  User chose CSV+Excel+PDF, a new epic (EPIC-16), and a custom lightweight date picker over a
  third-party library. All three choices are reflected below.
- **Exception breakdown pills reuse the existing `reason` URL filter, not new state.** Clicking a
  pill calls the same `updateFilters({ reason })` the (now-removed) reason `<select>` called —
  one source of truth for "what reason is selected," whether set via a pill or the Filter menu.
  "All" clears the filter rather than being a separate concept.
- **Reason filtering now has two equivalent entry points (pills and the Filter icon menu) by
  design, not by accident.** The pills cover the common single-click case; the Filter icon is
  there because the request explicitly asked for it to be a real, working control, not because
  the product needed a second way to do the same thing. Both write to the same state, so they
  can never disagree.
- **Sort icon menu duplicates the existing sortable-column-header behavior on purpose.** Rather
  than invent a second sort mechanism, `SortMenu` calls the same `onChange` prop `Toolbar` passes
  through to `updateFilters`, exactly like clicking a column header does. One underlying
  implementation, two ways to reach it.
- **A shared `usePopover` hook, not four separate open/close implementations.** Filter, Sort,
  Export, and the date range picker all need the same disclosure behavior (open/close, dismiss
  on outside click or Escape). Deliberately not a full focus trap like `ExceptionDrawer`'s — these
  are small, single-purpose menus, not a modal workflow, so returning focus and dismiss-on-
  outside-click is the same bar a native `<select>` clears, not less.
- **Kibana-style date range picker resolves relative presets to concrete dates immediately,
  rather than storing "last 7 days" as a live, recomputing filter.** `apps/api`'s date filters
  are day-granularity ISO strings (`YYYY-MM-DD`) matching the source CSVs (`data/*.csv` have no
  time-of-day component) — there was no real precision to preserve by keeping a "relative" mode
  around after the pick. The displayed range button always shows the actual applied absolute
  dates, so it can never silently go stale or lie about what's currently filtered. Verified this
  is a real behavior, not just a claim: `DateRangePicker.test.tsx` mocks the system clock and
  asserts "Last 7 days" resolves to the correct concrete dates.
- **Export gained `format` (csv/xlsx/pdf) and now also honors the table's current `sortBy`/
  `sortOrder`, which it never did before.** "Export the current view" was read literally — a
  filtered-and-sorted export that came back in a different order than what was on screen would
  be a real, if subtle, correctness gap. `reconciliationService.ts`'s sort logic was extracted
  into one `sortExceptions` helper reused by both `listExceptions` and `listExceptionsForExport`
  rather than duplicated.
- **PDF export is hand-drawn with PDFKit, not a table-plugin dependency.** PDFKit has no built-in
  table support; the export need is a fixed-width column report, which is a small amount of
  manual layout code (`exceptionsPdf.ts`) rather than justifying an extra dependency for one use.
  Excel export uses `exceljs` (a real, actively maintained library) since building a valid .xlsx
  by hand is not a reasonable trade-off the way a simple PDF table is.
- **All three export formats read from one shared row-shape module** (`exceptionsExportRows.ts`)
  instead of each serializer independently deciding column order and formatting. The existing
  `exceptionsCsv.ts` was refactored onto it rather than left to drift from the two new formats.
- **The single-format `ExportButton` was deleted, not deprecated alongside `ExportMenu`.** Once
  the toolbar redesign made a 3-format menu the real UI, keeping the old component around unused
  would be dead code with its own now-stale test file.

## Direction changes / pivots

- The date range panel's popover initially inherited the same `right: 0` anchoring used by the
  Filter/Sort/Export menus (all on the toolbar's right side). Live-verified in a real browser
  (not just Jest/RTL, which doesn't lay out real viewport geometry) — the panel opened off-screen
  under the sidebar, because the date picker sits at the _left_ end of the toolbar. Fixed with a
  `panelLeft` modifier class rather than a one-off inline style, since it's a real, reusable
  positioning distinction (leftmost vs. rightmost toolbar item), not a one-time hack.

## Deferred / explicitly out of scope this session

- The date range picker's relative presets resolve against real wall-clock "now," and the sample
  dataset's transaction dates (`data/*.csv`) all fall in July 2026 — so a preset like "Last 7
  days" against the actual current date correctly produces an empty filtered result today. This
  is honest, correct behavior (the same thing a real product would do with no recent data), not a
  bug, but it means the presets aren't useful against this specific static dataset without first
  picking an absolute range that overlaps it. Not fixed by anchoring presets to the dataset's own
  date range instead of real time, since that would misrepresent what "Last 7 days" means.
- No dedicated "no rows match this filter" empty state inside the table region distinct from the
  page-level all-clear state — this predates EPIC-16 (the reason dropdown could already produce a
  zero-row result) and wasn't part of what was asked for this session.

## Missed / noticed but not fixed

- None new this session.

## Open questions for next session

- None specific to EPIC-16. The standing open questions are the pre-existing ones in
  `docs/project-overview.md`'s "Known open gaps" (responsive/mobile audit, per-journey e2e specs).

## Resume point

- No further MASTER_PROMPT phase or user-requested epic is currently open.
- Minimum files to read first if resuming toolbar/export work: `apps/web/src/dashboard/Toolbar.tsx`
  (the composition point), `apps/web/src/dashboard/usePopover.ts` (shared disclosure behavior),
  `apps/api/src/serializers/exceptionsExportRows.ts` (the one row shape all three export formats
  share).
