Design a polished product experience for a Rapyd-style merchant settlement reconciliation portal.

This is a take-home assessment for a Domain Owner / Product + Engineering role.

Do not treat this as a generic analytics dashboard.

The primary user is a merchant finance or operations user who is worried because a settlement or transaction may not reconcile correctly.

Their primary question is:

"Has my settlement reconciled correctly, and if not, what needs my attention?"

I will provide a product specification. Treat that specification as the source of truth for product requirements.

PRODUCT EXPERIENCE PRINCIPLES

1. The merchant should understand overall reconciliation health within approximately five seconds.

2. Prioritize actionable exceptions over vanity metrics and charts.

3. Do not assume the merchant understands internal reconciliation terminology.

4. Do not imply that money is definitively missing simply because an exception exists.

5. Build trust through clear, factual explanations.

6. Treat "everything reconciled" as an important positive state, not as an empty-table afterthought.

7. Use a professional global-fintech visual language:
   - trustworthy
   - calm
   - operational
   - information-dense enough for finance users
   - modern without looking like a marketing landing page

INFORMATION HIERARCHY

Design around these questions:

1. Are my settlements healthy?
2. If not, how many transactions require attention?
3. Is there financial impact?
4. Which transactions are affected?
5. Why was each transaction flagged?
6. What should I do next?

PRIMARY DASHBOARD

Include:

- page title and reconciliation period
- overall reconciliation status
- transactions reconciled
- transactions requiring attention
- financial impact grouped by currency when necessary
- exception breakdown
- reason/date filters
- exceptions table
- export action

Avoid adding charts unless they materially improve a merchant decision.

EXCEPTION TABLE

Possible exception categories include:

- Ledger entry not found
- Settlement record not found
- Amount doesn't match
- Duplicate ledger entry
- Transaction date doesn't match

Design merchant-friendly presentation.

Useful information may include:

- transaction ID
- exception reason
- date
- expected/settlement amount
- ledger amount
- difference
- action

EXCEPTION DETAIL EXPERIENCE

Design a side drawer or similarly contextual experience.

The merchant should be able to investigate an exception without losing their dashboard/filter context.

Include:

- transaction
- exception title
- concise explanation
- settlement data
- ledger data
- amount difference when relevant
- relevant dates
- suggested next step
- optional AI-powered "Explain this" experience

The AI feature should visually feel assistive, not authoritative.

STATES

Create designs for:

1. Populated state with exceptions
2. All-clear state
3. Loading state
4. API/error state

ALL-CLEAR STATE

Do not use generic language such as:

"No data."

Instead communicate success clearly, for example:

"Everything reconciled for this period."

ERROR STATE

Do not suggest that merchant financial data has disappeared.

Give the merchant a retry path and calm explanation.

ACCESSIBILITY

Design with:

- strong hierarchy
- readable contrast
- visible focus states
- status text/icons in addition to color
- clearly labelled controls
- keyboard-friendly interactions
- accessible tables and drawer

RESPONSIVE

Also create a smaller-screen direction.

On mobile, prioritize:

- status
- transaction
- exception reason
- amount/difference
- action

Do not simply squeeze a wide desktop table onto mobile.

DELIVERABLE

First propose 3 substantially different UX directions.

For each explain:

- design philosophy
- information hierarchy
- strengths
- risks

Do NOT implement code yet.

After presenting the three directions, recommend which direction best fits a payments/fintech merchant operations product and explain why.

We will select one direction and refine it before handoff to Claude Code.
