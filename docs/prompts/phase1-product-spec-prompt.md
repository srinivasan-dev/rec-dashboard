Do not write application code yet.

Create:

docs/product-spec.md

This is for a Rapyd Domain Owner / Product + Engineering take-home assessment.

The role expects spec-driven development, strong product judgment, hands-on engineering, stakeholder ownership, and measurable commercial outcomes.

The hiring manager is particularly experienced in UI/UX, product management, and domain ownership, so the document must show strong product reasoning rather than merely describing components.

BUSINESS PROBLEM

Merchants currently have no self-service visibility into settlement reconciliation.

When a payout appears short or a transaction appears missing, they contact support, and support manually investigates internal systems.

We are building the first version of a Client Portal for logged-in merchant M-104.

The merchant should quickly answer:

"Has my settlement reconciled correctly, and if not, what needs my attention?"

Create a concise but high-quality product specification containing:

## 1. Problem Statement

Explain:

- current merchant pain
- support-team pain
- trust/business impact

Keep it concrete.

## 2. Primary User

Define the likely user in one sentence.

Assume this is primarily a merchant finance, operations, reconciliation, or support user rather than a software engineer.

## 3. User Outcome

Define what the merchant should understand or be able to do after using the portal.

Focus on outcomes, not features.

## 4. Core User Journeys

Define exactly three primary journeys:

1. Understand overall reconciliation health.
2. Investigate a transaction requiring attention.
3. Export exception information for further operational use.

For each journey write:

- Trigger
- User question
- Key information required
- Expected action/outcome

## 5. Goals

Define 3–5 first-version goals.

Examples may include:

- reduce uncertainty around settlement status
- enable self-service investigation
- reduce avoidable support contacts
- explain exceptions clearly
- build merchant trust

## 6. Non-Goals

Define what this first version intentionally does NOT solve.

Examples:

- fixing financial records automatically
- initiating adjustments or payouts
- resolving disputes
- replacing all support workflows
- real-time settlement ingestion

Do not promise functionality outside the assessment.

## 7. Information Architecture

Design the merchant dashboard around user questions rather than technical data structures.

Propose hierarchy:

Page header
Overall reconciliation status
Summary / financial impact
Exceptions requiring attention
Filters
Exceptions table
Exception detail experience
Export action

For each section explain:

"What question does this answer for the merchant?"

## 8. UX States

Explicitly define:

LOADING

What should the merchant see and understand?

ALL CLEAR

Treat this as a successful product outcome.

Avoid generic language like:
"No records found."

Prefer a clear positive state such as:

"Everything reconciled for this period."

ERROR

Explain:

- what went wrong in merchant-friendly terms
- retry path
- how to avoid implying data loss

POPULATED

Explain how exceptions should be prioritized and communicated.

## 9. Exception Language

The system may identify:

MISSING_LEDGER
MISSING_SETTLEMENT
DUPLICATE_LEDGER
AMOUNT_MISMATCH
DATE_MISMATCH

Create merchant-friendly labels for each.

For example:

AMOUNT_MISMATCH
→ "Amount doesn't match"

Avoid unnecessarily exposing internal reconciliation terminology.

For each exception define:

- merchant-facing title
- one-sentence explanation
- recommended next step

Be careful not to imply that money is definitively lost unless the data proves it.

## 10. Rough UX / Wireframe

Create an ASCII wireframe for the desktop experience.

It should visually prioritize:

1. overall status
2. exceptions requiring attention
3. investigation

Avoid designing a generic analytics dashboard.

## 11. Responsive Strategy

Describe how the experience should work on a smaller screen.

Focus on:

- priority information
- filters
- exception readability
- detail exploration

## 12. Accessibility Commitment

Use WCAG 2.1 AA basics.

Include:

- semantic page structure
- keyboard navigation
- table headers
- accessible filter labels
- visible focus
- status communicated through text/icon, not color alone
- accessible error messaging
- accessible detail drawer/modal behavior

## 13. Definition of Done

Define:

One UX commitment.

Example:
"A merchant must be able to understand overall reconciliation status and investigate an exception using keyboard navigation alone."

One business metric.

Primary candidate:
"Reduction in settlement/reconciliation-related support contacts per active merchant."

Explain how we would measure it after launch.

## 14. Assumptions

List ambiguous domain/product assumptions explicitly.

Do not silently invent business behavior.

## 15. Risks

Identify product risks such as:

- misleading merchants about financial impact
- treating reconciliation exceptions as definitive money loss
- multi-currency aggregation
- incomplete source data
- AI-generated explanation inaccuracies

## 16. Product Trade-Off

State one deliberate first-version trade-off.

Prefer something meaningful such as:

"We prioritize trustworthy reconciliation, clear states, accessibility, and actionable explanations over advanced analytics and visual polish."

## 17. Success Criteria

Define 4–6 testable acceptance criteria covering:

- merchant isolation
- overall status
- exception investigation
- filtering
- export
- accessibility
- failure handling

## 18. AI Usage Disclosure

Add a short note that AI-assisted tooling was used for brainstorming, review, and implementation support, while final product and engineering decisions were reviewed by the candidate.

IMPORTANT:

Keep the document concise and interview-defensible.

Do not write frontend/backend implementation yet.

After writing the spec, perform a second review acting as Rapyd's Head of Merchant Support and a UX/Product lead.

Return:

1. the three strongest parts of the spec
2. the three weakest or most questionable decisions
3. any language that could confuse or worry a merchant
4. recommendations before we move to engineering
