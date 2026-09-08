# Settlement Reconciliation Portal — Product Specification

## 1. Problem Statement

**Merchant pain:** Merchants on Rapyd's payments platform have zero self-service visibility into whether their settlements reconciled correctly. When a payout appears short or a transaction seems missing, their only option is to email support and wait — often days — for a manual investigation.

**Support-team pain:** Every "where's my money?" inquiry requires a support agent to manually cross-reference the processor's settlement file against the internal ledger. This is time-consuming, error-prone, and unscalable as merchant volume grows.

**Trust and business impact:** Settlement uncertainty erodes merchant confidence in the platform. Even when reconciliation is correct, the inability to verify it independently creates anxiety. Merchants who cannot trust their payment provider will eventually move to one they can.

## 2. Primary User

A merchant finance or operations user (e.g., accountant, controller, or business owner) who needs to verify that processor settlements match internal ledger records, and investigate any discrepancies — without contacting support.

## 3. User Outcome

After using the portal, the merchant should be able to:

- Confirm at a glance whether their settlements reconciled correctly for a given period
- Understand _what_ is flagged and _why_, in plain language they can act on
- Export exception data for their own records, internal investigation, or to share with their finance team

The primary question the portal answers: **"Has my settlement reconciled correctly, and if not, what needs my attention?"**

## 4. Core User Journeys

### Journey 1: Understand overall reconciliation health

|                      |                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**          | Merchant logs into the portal (daily check, post-payout, or after receiving a settlement notification)                                               |
| **User question**    | "Is everything okay with my settlements?"                                                                                                            |
| **Key information**  | Total transactions checked, matched count, exception count, financial impact by currency                                                             |
| **Expected outcome** | Merchant sees a clear status — either "all reconciled" (positive confirmation) or a summary of items requiring attention with their financial impact |

### Journey 2: Investigate a transaction requiring attention

|                      |                                                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**          | Merchant sees exceptions in the summary, or is looking for a specific transaction                                                                                                                                 |
| **User question**    | "What's wrong with this transaction, and what should I do?"                                                                                                                                                       |
| **Key information**  | Transaction ID, exception type in plain language, settlement vs. ledger amounts, dates, difference, and a recommended next step                                                                                   |
| **Expected outcome** | Merchant understands the discrepancy without needing to contact support. For straightforward cases, they can resolve internally. For complex cases, they have the data needed to file an informed support request |

### Journey 3: Export exception data for operational use

|                      |                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Trigger**          | Merchant needs to share reconciliation data with their finance team, auditor, or wants a record for their own systems |
| **User question**    | "Can I get this data out of the portal?"                                                                              |
| **Key information**  | Filtered exception list with all relevant fields                                                                      |
| **Expected outcome** | Merchant downloads a CSV/file of their exceptions, scoped to their active filters, for offline use                    |

## 5. Goals (V1)

1. **Reduce settlement uncertainty** — Merchants can independently verify reconciliation status without waiting for support
2. **Enable self-service investigation** — Clear, merchant-friendly explanations let users understand exceptions on their own
3. **Reduce avoidable support contacts** — Straightforward "where's my money?" questions are answered by the portal itself
4. **Explain exceptions honestly** — Use factual, careful language that distinguishes "needs review" from "money is missing"
5. **Build trust through transparency** — Showing what matched (not just what's wrong) signals that the platform is accountable

## 6. Non-Goals (V1)

- **Fixing records automatically** — The portal shows discrepancies; it does not modify settlement or ledger data
- **Initiating adjustments or payouts** — No financial actions are taken through this interface
- **Dispute resolution workflows** — No case management, assignment, or status tracking for disputed transactions
- **Replacing all support workflows** — Complex or ambiguous cases still require human support
- **Real-time settlement ingestion** — Data is batch-processed; we do not stream live settlement feeds
- **Multi-merchant views** — Each merchant sees only their own data; no parent/child merchant hierarchies

## 7. Information Architecture

The dashboard is structured around merchant questions, ordered by urgency:

```
+------------------------------------------------------------------+
| PAGE HEADER                                                       |
| "Settlement Reconciliation"  |  Merchant: M-104  |  Export       |
+------------------------------------------------------------------+
```

**Q: "Am I okay?"**

```
+------------------------------------------------------------------+
| OVERALL STATUS                                                    |
| [Status indicator] "3 of 15 transactions need attention"          |
|  or  "All 12 transactions reconciled — you're all clear"          |
+------------------------------------------------------------------+
```

A single, scannable status line. This is the first thing the merchant reads. It answers the most important question in under five seconds.

**Q: "How bad is it?"**

```
+------------------------------------------------------------------+
| SUMMARY CARDS                                                     |
| [Checked: 15] [Matched: 12] [Exceptions: 3] [Impact: $24.31 USD]|
+------------------------------------------------------------------+
```

Numeric context. Financial impact is grouped by currency — we never aggregate AED and USD into a meaningless single total.

**Q: "What kind of problems?"**

```
+------------------------------------------------------------------+
| EXCEPTION BREAKDOWN                                               |
| Amount doesn't match: 1  |  Missing from ledger: 1  | ...        |
+------------------------------------------------------------------+
```

Categorized counts help merchants understand the nature of exceptions before diving into individual rows.

**Q: "Which transactions?"**

```
+------------------------------------------------------------------+
| FILTERS                                                           |
| Reason: [All v]   Date range: [From] [To]                        |
+------------------------------------------------------------------+
| EXCEPTIONS TABLE                                                  |
| Transaction | Reason           | Date    | Amounts    | Action    |
| T1013       | Amount mismatch  | Jul 8   | $267→$243  | View      |
| T1006       | Missing ledger   | Jul 1   | $1,384.66  | View      |
| ...                                                               |
| [< 1 of 1 >]                                                     |
+------------------------------------------------------------------+
```

Filterable, sortable, paginated. Keyboard-navigable rows.

**Q: "What exactly happened with this one?"**

```
+--------------------------------------+---------------------------+
|                                      | EXCEPTION DETAIL (DRAWER) |
|  (table remains visible,             | Transaction: T1013        |
|   preserving context)                | Amount doesn't match      |
|                                      |                           |
|                                      | Settlement: $267.80       |
|                                      | Ledger:     $243.49       |
|                                      | Difference: $24.31        |
|                                      |                           |
|                                      | "The ledger records       |
|                                      |  $24.31 less than the     |
|                                      |  settlement processor     |
|                                      |  reported."               |
|                                      |                           |
|                                      | Next step: Review ledger  |
|                                      | entry or contact support  |
|                                      | with this reference.      |
|                                      |                           |
|                                      | [Close]                   |
+--------------------------------------+---------------------------+
```

A side drawer preserves the merchant's table context (filters, scroll, pagination) while showing transaction detail.

## 8. UX States

### LOADING

|                      |                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Merchant message** | "Loading your reconciliation data..."                                                                                                              |
| **Primary UI**       | Subtle loading indicators in place of summary cards and table. No spinner-only screen — show the page skeleton so the merchant knows what's coming |
| **Available action** | None needed. Loading should complete within a few seconds                                                                                          |

### ALL CLEAR

|                      |                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Merchant message** | "All transactions reconciled — you're all clear."                                                                                                                                                                                 |
| **Primary UI**       | A positive, visually distinct confirmation. Summary cards show totals with zero exceptions. No empty table — this is a _good_ outcome, not a missing-data state. Show a brief confirmation with the count of matched transactions |
| **Available action** | Export (for record-keeping even when everything matches)                                                                                                                                                                          |

This is a real product success state. A merchant who sees "all clear" leaves with confidence — that's the outcome we're optimizing for.

### ERROR

|                      |                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Merchant message** | "We couldn't load your reconciliation data right now. Your data is safe — this is a temporary issue on our end."                             |
| **Primary UI**       | Clear error message. No technical jargon (no "500 Internal Server Error"). Avoid language that implies data loss or incorrect reconciliation |
| **Available action** | Retry button. If the problem persists, a fallback message suggesting the merchant contact support                                            |

### POPULATED (Exceptions Found)

|                      |                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------- |
| **Merchant message** | "X of Y transactions need attention"                                                     |
| **Primary UI**       | Full dashboard: status, summary cards, exception breakdown, filters, and populated table |
| **Available action** | Filter, sort, view detail, export                                                        |

Exceptions are presented factually. We avoid alarm-inducing language — an exception means "this needs review," not "you lost money."

## 9. Exception Language

| Internal Code        | Merchant-Facing Title      | Explanation                                                                                               | Recommended Next Step                                                                                                                |
| -------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `MISSING_LEDGER`     | **Not recorded in ledger** | "This transaction appears in the processor's settlement but doesn't have a matching entry in our ledger." | "Review whether this transaction was processed. If expected, contact support with this transaction ID."                              |
| `MISSING_SETTLEMENT` | **No matching settlement** | "This transaction is in our ledger but wasn't included in the processor's settlement file."               | "This may indicate a pending settlement. If the transaction is older than your typical settlement cycle, contact support."           |
| `DUPLICATE_LEDGER`   | **Duplicate entry**        | "This transaction appears more than once in the ledger for the same amount."                              | "Review whether the transaction was accidentally recorded twice. Contact support if you need the duplicate removed."                 |
| `AMOUNT_MISMATCH`    | **Amount doesn't match**   | "The settlement amount from the processor differs from the amount in our ledger."                         | "Compare the settlement and ledger amounts shown. Contact support with this transaction ID if you need the difference investigated." |
| `DATE_MISMATCH`      | **Date discrepancy**       | "The transaction date in the settlement differs from the date in our ledger."                             | "Small date differences can occur due to processing timing. If the dates are significantly different, contact support."              |

**Language principles:**

- Never claim money is "lost" or "missing" — use "doesn't match" or "needs review"
- Always suggest a concrete next step
- Keep explanations to one sentence
- Avoid internal terminology (e.g., "reconciliation engine," "ledger_export")

## 10. Rough UX / Wireframe

### Desktop Layout

```
+====================================================================+
|  RAPYD CLIENT PORTAL                              [Merchant: M-104] |
+====================================================================+
|                                                                      |
|  Settlement Reconciliation                              [Export CSV] |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  |  ! 3 of 15 transactions need attention                         | |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  +------------+ +------------+ +------------+ +-----------------+   |
|  | Checked    | | Matched    | | Exceptions | | Impact          |   |
|  |     15     | |     12     | |      3     | | $24.31 USD      |   |
|  +------------+ +------------+ +------------+ +-----------------+   |
|                                                                      |
|  Exception breakdown:                                                |
|  [Amount mismatch: 1] [Not in ledger: 1] [Duplicate: 1]            |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Reason: [All types      v]   From: [________]  To: [________]  | |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Transaction | Reason           | Date       | Amount  | Action | |
|  |-------------|------------------|------------|---------|--------| |
|  | T1013       | Amount mismatch  | 2026-07-08 | $24.31  | View > | |
|  | T1006       | Not in ledger    | 2026-07-01 |$1384.66 | View > | |
|  | T1054       | Date discrepancy | 2026-07-05 |    —    | View > | |
|  +----------------------------------------------------------------+ |
|  |                           Page 1 of 1                          | |
|  +----------------------------------------------------------------+ |
|                                                                      |
+======================================================================+
```

### Visual priorities (top to bottom):

1. **Status** — Am I okay? (answered immediately)
2. **Impact** — How bad? (answered with summary cards)
3. **Detail** — Which transactions? (answered by the table)

This is not a generic analytics dashboard. Every element serves the merchant's primary question: "Did my money reconcile correctly?"

## 11. Responsive Strategy

On smaller screens (tablet and mobile):

- **Summary cards** stack vertically (2-column grid on tablet, single column on mobile)
- **Filters** collapse into a toggle-able filter panel to preserve vertical space
- **Exceptions table** transforms into **stacked transaction cards** rather than forcing a horizontal-scroll table. Each card shows: transaction ID, exception reason, date, and impact — with a tap target to open the detail view
- **Detail drawer** becomes a full-screen overlay on mobile, with a clear back/close action
- **Export button** remains accessible in the page header

**Rationale:** Merchant finance users may check reconciliation from a phone while traveling or in a meeting. The card layout keeps each transaction scannable without pinch-zooming a wide table.

## 12. Accessibility Commitment

We design to **WCAG 2.1 AA** as a baseline:

- **Semantic page structure** — Proper heading hierarchy (h1 page title, h2 sections), `<main>`, `<nav>`, landmark regions
- **Keyboard navigation** — All interactive elements (filters, table rows, drawer, export) reachable and operable via keyboard alone. Tab order follows visual hierarchy
- **Table headers** — `<th>` elements with `scope` attributes. Sort controls are `<button>` elements, not click handlers on divs
- **Accessible filter labels** — Every form control has a visible `<label>` or `aria-label`
- **Visible focus** — Custom focus indicator (not browser default) that meets 3:1 contrast ratio against adjacent colors
- **Status via text + icon, not color alone** — Exception severity and status use icons and text labels alongside any color coding. A color-blind merchant can still distinguish "all clear" from "needs attention"
- **Accessible error messaging** — Error states use `role="alert"` or `aria-live="polite"` to announce to screen readers
- **Drawer/modal behavior** — Focus trapped inside open drawer, `Escape` closes, focus returns to triggering element on close. Drawer has an accessible title via `aria-labelledby`
- **Loading announcements** — `aria-live="polite"` region announces when data has loaded

## 13. Definition of Done

### UX Commitment

> A merchant must be able to understand their overall reconciliation status, investigate any exception, and export their data using keyboard navigation alone — without relying on color to interpret status.

### Business Metric

**Primary:** Reduction in settlement/reconciliation-related support contacts per active merchant.

**How to measure after launch:**

1. Tag existing support tickets related to settlement reconciliation (e.g., "where's my money?", payout discrepancy, missing transaction) as a baseline category
2. Track portal adoption: unique merchant logins, pages viewed, export downloads
3. Compare weekly support ticket volume in this category against portal adoption over 30/60/90 day windows
4. Normalize by active merchant count to account for platform growth
5. Secondary diagnostics: time-to-resolution for tickets that _are_ filed (merchants who use the portal should file more informed tickets), and portal bounce rate (merchants who leave without viewing exceptions may indicate a UX problem)

**Target:** 20-30% reduction in reconciliation-related support tickets within 90 days of launch for merchants with portal access, compared to a control group without access.

## 14. Assumptions

1. **Authentication is handled externally** — We assume a session/token mechanism provides the authenticated `merchantId`. The portal does not implement login flows
2. **Settlement and ledger data are pre-loaded** — Data is available via CSV (or future database). We do not handle real-time ingestion or streaming updates
3. **Reconciliation is per-merchant, per-transaction** — We match on `merchantId + transactionId` composite key, not `transactionId` alone (transaction IDs may not be globally unique across merchants)
4. **Net amount is the reconciliation target** — We compare the settlement's `net_amount` (after fees) against the ledger's `amount`, since that's what the merchant actually receives
5. **Single currency per transaction** — Each transaction has one currency. We do not convert or aggregate across currencies
6. **Settlement data is authoritative for what the processor sent** — We don't validate whether the processor's data is correct, only whether it matches our ledger
7. **Exceptions require human judgment** — The portal surfaces exceptions but does not auto-resolve them. A "date discrepancy" may be benign (processing delay) or meaningful (wrong transaction)
8. **One logged-in merchant at a time** — No parent/child merchant hierarchies or multi-merchant views in V1

> **Editorial note, added 2026-09-08 (EPIC-15):** Assumption 1 above reflects this document's
> original Phase 1 scope, per the assessment brief's own "assume authentication is already solved
> elsewhere" instruction, and is left unedited as the submitted artifact it was. A real (if
> deliberately simple) login was added afterward, outside the brief's scope, at direct user
> request — see `docs/architecture.md` §4 and §9 for what actually changed and why the isolation
> guarantee itself didn't.

## 15. Risks

| Risk                                                                                                                                                                          | Severity | Mitigation                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Misleading merchants about financial impact** — Exception language could imply money is definitely lost when reconciliation differences often have operational explanations | High     | Use careful language: "needs review" not "missing funds." Always suggest next step. Never quantify "loss" — quantify "difference"                                       |
| **Multi-currency aggregation** — Summing amounts across currencies into a single total would be financially meaningless and potentially misleading                            | Medium   | Always group financial impact by currency. Never aggregate AED + USD + EUR into one number                                                                              |
| **Incomplete source data** — If settlement or ledger files are partial, the portal would show false "missing" exceptions                                                      | Medium   | Document data freshness assumptions. Consider showing data timestamp so merchants know when data was last updated                                                       |
| **AI-generated explanation inaccuracy** — LLM explanations could hallucinate or speculate beyond the data                                                                     | Medium   | Ground LLM strictly in reconciliation facts. Fall back to deterministic explanations if LLM output is unreliable. Never let LLM determine _whether_ an exception exists |
| **Over-reliance on portal** — Merchants may assume "all clear" means everything is financially correct, when reconciliation only checks what's in our two data sources        | Low      | Status text should say "all transactions reconciled" not "all finances are correct" — scope the claim to what was checked                                               |

## 16. Product Trade-Off

> **We prioritize trustworthy reconciliation results, clear exception states, accessibility, and actionable merchant explanations over advanced analytics, visual polish, and real-time data.**

**What this means concretely:**

- We ship a dashboard that is correct, accessible, and understandable — not one that is beautiful but potentially misleading
- We use deterministic rules for reconciliation, not probabilistic matching
- We invest in all four UX states (including "all clear" and "error") rather than only the happy path
- We defer: charts/visualizations, trend analysis, real-time webhooks, dispute workflows, and visual design refinement

**What we'd add next:** Historical trend views (is my exception rate improving?), real-time settlement ingestion, and a dispute initiation workflow directly from the exception detail view.

## 17. Success Criteria

| #   | Criterion                                                                                                                         | Testable?                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Merchant M-104 sees only their own data — no other merchant's transactions are visible or accessible via API                      | Yes — verify API returns only M-104 data; attempt to access another merchant's data and confirm rejection |
| 2   | Overall status accurately reflects reconciliation: shows "all clear" when no exceptions exist, shows exception count when they do | Yes — test with matched-only data and with exception data                                                 |
| 3   | Merchant can view exception detail and understand the discrepancy without domain expertise                                        | Yes — usability: can a non-technical user explain what happened after reading the detail view?            |
| 4   | Filters (reason, date range) correctly narrow the exceptions table and persist on page refresh via URL params                     | Yes — apply filters, verify table updates, refresh page, confirm filters persist                          |
| 5   | Export downloads only the authenticated merchant's exceptions, respecting active filters                                          | Yes — export and verify file contains only M-104 data matching current filters                            |
| 6   | All interactive elements (filters, table rows, drawer, export) are operable via keyboard alone                                    | Yes — tab through the entire flow without using a mouse                                                   |
| 7   | Error state displays a merchant-friendly message with retry, and does not expose technical details                                | Yes — simulate API failure and verify UX                                                                  |

## 18. AI Usage Disclosure

AI-assisted tooling (Claude Code) was used for product brainstorming, structuring the spec outline, and reviewing language choices. All product decisions, information architecture, exception language, accessibility commitments, and trade-off rationale were reviewed and refined by the candidate. The final document reflects the candidate's product judgment applied to the Rapyd reconciliation domain.

---

## Appendix: Review from Rapyd's Head of Merchant Support & UX/Product Lead

### Three Strongest Parts

1. **Exception language is merchant-safe** — The distinction between "needs review" and "money missing" protects both the merchant (from unnecessary alarm) and Rapyd (from implied liability). The per-exception next-step recommendations give merchants actionable guidance instead of a dead-end data dump.

2. **"All clear" as a product outcome** — Treating successful reconciliation as a positive experience (not an empty state) is the right call. Most merchants most days will have zero exceptions — making that feel like a win builds trust and encourages repeat visits to the portal.

3. **Measurable success metric with a concrete measurement plan** — Tying success to reduction in reconciliation support tickets, with a specific measurement methodology (tagged tickets, adoption tracking, control group), gives the Head of Support something they can actually track and report on.

### Three Weakest or Most Questionable Decisions

1. **No data freshness indicator** — The spec doesn't address when the data was last updated. A merchant seeing "all clear" at 9am doesn't know if that reflects settlements from last night or last week. Adding a "Data as of: [timestamp]" would prevent false confidence. _This is the most likely support escalation gap._

2. **Export without context** — The export is described as a CSV of exceptions, but there's no mention of including matched transactions in exports. A merchant's finance team may need the full reconciliation picture (matched + exceptions) for their records, not just the problems. Consider offering "Export all" vs "Export exceptions."

3. **Limited exception detail for duplicates** — The duplicate entry explanation tells the merchant to "review whether the transaction was accidentally recorded twice" but doesn't show _which_ ledger entries are the duplicates. Without showing both entries, the merchant can't actually verify this themselves, which undermines the self-service goal.

### Language That Could Confuse or Worry

- "No matching settlement" could alarm a merchant into thinking their payment was never processed. Consider adding "This may be a timing issue" more prominently.
- "Contact support with this transaction ID" appears in multiple next steps — this is fine but should eventually link to a support flow rather than being generic advice.

### Recommendations Before Engineering

1. Add a data freshness timestamp to the dashboard header
2. Consider whether the export should include matched transactions, not just exceptions
3. For duplicate exceptions, show both ledger entries in the detail view so the merchant can verify
4. Validate exception language with a small group of actual merchant support agents before launch
