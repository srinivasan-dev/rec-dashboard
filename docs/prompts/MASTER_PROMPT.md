## PHASE 1 — Product Thinking and UX

Do not write application code yet.

Create docs/product-ux.md for this Rapyd settlement reconciliation portal.

Think as both:

- a senior product-minded frontend/full-stack engineer
- a merchant operations/finance user

The logged-in merchant is M-104.

The primary question the user should be able to answer quickly is:

"Did my money reconcile correctly, and if not, what needs my attention?"

Create a concise 1–2 page product/UX document containing:

1. USER

Write one sentence describing:

- who is logging in
- what decision/problem they are trying to resolve

2. CORE JOURNEYS

Define exactly three primary merchant journeys.

Prefer:

- understand overall settlement health
- investigate an exception
- export reconciliation data

3. INFORMATION HIERARCHY

Propose a single-dashboard experience containing:

Header
Reconciliation status summary
Exception impact summary
Filters
Exceptions table
Exception detail drawer
Export action

Explain why the hierarchy matches merchant priorities.

4. STATES

Explicitly design:

Loading
Empty / all clear
Error
Populated exceptions

Treat "all clear" as a positive product outcome rather than an empty table.

For each state describe:

- merchant message
- primary UI
- available action

5. EXCEPTION PRESENTATION

Exceptions may include:

Missing ledger
Missing settlement
Duplicate ledger
Amount mismatch
Transaction-date mismatch

Describe merchant-facing labels and descriptions.

Do not expose internal engineering terminology unnecessarily.

6. WIREFRAME

Create an ASCII wireframe showing the desktop dashboard.

Also describe how the exceptions table becomes usable on mobile.

7. ACCESSIBILITY COMMITMENT

Commit to WCAG 2.1 AA basics.

Include:

- semantic landmarks
- proper table headers
- keyboard usable controls
- visible focus state
- accessible names
- error announcements
- status represented through text/icon as well as color

8. DEFINITION OF DONE

UX commitment:
A merchant should be able to understand the reconciliation state and reach an exception explanation using keyboard navigation alone.

Business metric:
Reduction in settlement/reconciliation-related merchant support contacts.

Define how we could measure that metric.

9. ASSUMPTIONS

Explicitly document ambiguous product/domain assumptions instead of silently inventing them.

10. AI USAGE NOTE

Add a short transparent statement saying AI-assisted tooling was used for product brainstorming/review, while final product and engineering decisions were reviewed by the candidate.

Keep the document concise and interview-defensible.

After creating it, critique it from the perspective of Rapyd's Head of Merchant Support and tell me the three weakest areas before changing anything.

## PHASE 2 — Repository and Architecture

Inspect the repository and input CSV schemas.

Do not implement the full feature yet.

Create a clean full-stack project architecture.

Prefer:

apps/
api/
web/

packages/
shared/

or an equally simple structure if the repo already suggests another layout.

Backend:
Node.js + TypeScript + Express

Frontend:
React + TypeScript + Vite

Testing:
Jest/Supertest backend
React Testing Library frontend

Server state:
TanStack Query

Do NOT introduce Redux unless there is actual complex client-side state that TanStack Query/local URL state cannot handle.

Create:

docs/architecture.md

Document:

1. components
2. data flow
3. reconciliation boundary
4. merchant isolation strategy
5. API boundary
6. test strategy
7. error handling
8. monetary precision strategy
9. assumptions

The target architecture is:

CSV repositories
→ normalized records
→ reconciliation engine
→ service
→ REST API
→ React API client
→ UI

The reconciliation engine must have zero Express/React dependencies.

Set up:

lint
format
typecheck
test
dev scripts

Run installation, typechecking and an initial test/build.

Do not build the entire product yet.

At the end tell me which architectural choices I should be prepared to defend during the Rapyd interview.

## PHASE 3 — Reconciliation Engine

Now implement the core domain logic first.

Before coding, inspect settlement_export.csv and ledger_export.csv carefully.

The implementation must support multiple merchants generically even though the current session exposes only M-104.

Never hard-code transaction IDs or the expected M-104 exceptions.

Create normalized types such as:

SettlementRecord
LedgerRecord
ReconciliationResult
ReconciliationException
ExceptionReason

Implement deterministic reconciliation rules.

At minimum:

MISSING_LEDGER

- processor settlement exists
- corresponding ledger record does not

MISSING_SETTLEMENT

- ledger record exists
- settlement record does not

DUPLICATE_LEDGER

- more than one ledger entry represents the same merchant + transaction

AMOUNT_MISMATCH

- settlement net amount differs from ledger amount

DATE_MISMATCH

- transaction dates disagree

Also evaluate currency mismatch defensively even if M-104 does not currently demonstrate it.

IMPORTANT:

Reconcile using merchantId + transactionId, not transactionId alone.

Determine and document precedence when multiple problems exist.

For example, duplicates should not accidentally create several independent amount mismatches due to a naive SQL-style join.

Money comparisons should use a safe normalized representation such as integer minor units.

Produce:

matched transactions
exceptions
summary metrics
financial impact

Do not aggregate currencies together into a meaningless single monetary total.

Summary monetary impact should be grouped by currency when applicable.

Write comprehensive unit tests for:

perfect match
missing ledger
missing settlement
duplicate ledger
amount mismatch
date mismatch
currency mismatch
merchant isolation
money precision

Then run the tests.

Finally inspect M-104 and show me the resulting reconciliation output so I can manually verify it against the CSV files.

Explain the rule precedence and why.

## PHASE 4 — Backend API

Build the API around the reconciliation service.

Do NOT expose raw CSV access through controllers.

Assume a mocked authenticated session:

merchantId = M-104

Create middleware/helper representing the authenticated merchant context.

Endpoints:

GET /api/reconciliation/summary

GET /api/reconciliation/exceptions

GET /api/reconciliation/exceptions/:id

GET /api/reconciliation/exceptions/export

POST /api/reconciliation/exceptions/:id/explanation
(the explanation endpoint can initially be stubbed)

Exceptions endpoint query parameters:

page
pageSize
reason
from
to
sortBy
sortOrder

Use Zod or an equivalent schema validator.

Return a frontend-friendly pagination structure:

{
data: [],
pagination: {
page,
pageSize,
total,
totalPages
}
}

Design meaningful HTTP responses for:

400 invalid filters
404 exception not found
500 internal failure

Never allow merchant identifiers supplied by a client to override the authenticated merchant context.

CSV export must contain only the logged-in merchant's exceptions.

Write backend integration tests covering at minimum:

summary
pagination/filtering
merchant isolation
invalid parameters
export

Keep controllers thin.

After implementation:

run tests
run typecheck
run lint

Then show me the API response shapes and identify any decisions likely to be challenged in a senior engineering review.

## PHASE 5 — React Dashboard

Implement the merchant dashboard.

Product priority:

Within roughly five seconds, a finance/operations user should understand:

"Are my settlements healthy?"

Structure:

Page header
Status overview
Summary cards
Exception breakdown
Filter toolbar
Exceptions table
Export button

Use TanStack Query for remote/server state.

Represent useful filter/sort/page state in URL search parameters so:

- refresh preserves context
- URLs are shareable
- browser navigation behaves sensibly

Do not duplicate API state unnecessarily into another global store.

Summary should communicate:

transactions checked
matched
exceptions
exception breakdown
financial impact grouped by currency where required

Avoid color-only communication.

Provide textual status labels and accessible icons.

Implement:

Loading state
All-clear state
Error state with retry
Populated state

Do not use giant skeleton animations or excessive visual polish.

Prioritize clarity.

The exceptions table should show useful columns such as:

Transaction
Reason
Transaction date
Settlement/ledger amount where relevant
Difference/impact
Status/action

Rows should be keyboard actionable.

Add sorting and filters for:

reason
date range

Wire pagination to the backend.

Add Export.

Responsive behavior:

For smaller screens avoid forcing a huge desktop table.

Use either:

- priority columns + horizontal affordance
  or
- stacked transaction cards

Document the decision.

Run tests/typecheck after implementation.

Then review the UI from the perspective of a merchant who has no knowledge of reconciliation terminology.

## PHASE 6 — Exception Detail UX

Build the exception detail interaction.

Prefer a side drawer on desktop.

The drawer should preserve the user's current table filters, pagination and scroll context.

Show:

transaction ID
merchant-friendly exception label
plain-English deterministic explanation
settlement information
ledger information
amount difference where relevant
relevant dates
suggested next step

Example product language:

Instead of:

AMOUNT_MISMATCH

Use:

Amount doesn't match

Processor settlement:
$267.80

Internal ledger:
$243.49

Difference:
$24.31

Explanation:
"The ledger contains $24.31 less than the amount reported by the settlement processor."

Never claim that a merchant definitely lost money unless the data proves it.

Distinguish:

"needs review"

from:

"money missing"

because reconciliation differences can have operational explanations.

Make the drawer keyboard accessible:

focus management
Escape closes
accessible title
focus return

Add component tests where valuable.

## PHASE 7 — Frontend Tests

Focus tests on behavior rather than implementation details.

The assessment explicitly requires exceptions-table coverage.

Use React Testing Library.

Test at minimum:

1. renders populated exceptions
2. filters by reason
3. sorts the table
4. pagination
5. loading state
6. all-clear / empty state
7. API error state
8. retry behavior
9. opens exception details
10. export action where reasonably testable

Avoid snapshots for primary behavior validation.

Prefer queries accessible to users:

getByRole
getByLabelText
getByText

rather than class names or internal component details.

Run the entire suite.

Identify any flaky or implementation-coupled tests and improve them.

## PHASE 8 — LLM Explanation Feature

Implement the required merchant explanation feature.

CRITICAL ARCHITECTURAL RULE:

The LLM is NOT the reconciliation engine.

Deterministic application code determines:

- whether an exception exists
- exception reason
- expected amount
- actual amount
- difference
- associated dates

The LLM only turns trusted structured facts into merchant-friendly language.

Define an interface such as:

ExceptionExplanationProvider

Provide:

MockExplanationProvider

Design it so a real LLM provider could later replace the mock.

Generate the prompt from a strict structured context.

System intent:

"You explain payment reconciliation exceptions to merchants in clear factual language. Only use supplied information. Never speculate about missing funds, fraud, liability or settlement timing when it is not supported by the provided data."

Require concise output.

If the AI request fails:

show deterministic fallback text generated from the reconciliation rule.

If the result appears unusable:

show the deterministic explanation instead.

Do not expose an LLM failure as a blocking merchant experience.

Add docs/ai-design.md covering:

1. prompt design
2. grounding
3. hallucination controls
4. failure UX
5. logging/observability
6. PII/data-handling considerations
7. whether this should ship directly

Our recommendation should be:

AI-generated explanations may be merchant-visible when strongly grounded and bounded, but the underlying reconciliation determination must remain deterministic.

For higher-risk or ambiguous recommendations/escalations, retain human/support review.

Clearly mark where AI tooling was used in developing the take-home.

Add relevant tests.

## PHASE 9 — Accessibility Review

Perform a dedicated accessibility review.

Check:

semantic page structure
heading order
form labels
table headers
keyboard navigation
focus order
focus visibility
drawer/modal focus handling
screen reader descriptions
error announcements
loading announcements where appropriate
status semantics
color contrast assumptions
non-color status indicators

Fix substantive issues.

Do not introduce complicated accessibility abstractions unnecessarily.

Document accessibility choices in README or docs/accessibility.md.

Provide me with an interview-ready explanation of the three most important accessibility decisions.

## PHASE 10 — Stakeholder Memo

Write docs/stakeholder-memo.md.

Audience:

Head of Merchant Support.

Do NOT write this like an engineering architecture document.

Maximum about one page.

Explain:

1. WHAT MERCHANTS CAN NOW DO

They can independently understand their reconciliation status, investigate common exceptions and export their exception data.

2. WHAT STILL REQUIRES SUPPORT

Cases where the portal provides evidence but cannot safely resolve the financial/operational issue itself.

Do not imply the portal automatically fixes settlement discrepancies.

3. TRADE-OFF

Choose one meaningful constraint-driven trade-off.

A strong candidate:

"We prioritized trustworthy reconciliation, exception states, accessibility and merchant explanations over advanced visualization and real-time ingestion."

Explain what we'd add next.

4. METRIC

Primary metric:

reduction in merchant support contacts related to settlement/reconciliation questions.

Describe how to compare portal adoption with support-ticket trends.

Optionally mention supporting diagnostic metrics without diluting the primary metric.

5. AI

Briefly explain that AI-generated explanations are grounded in deterministic reconciliation data and have safe fallbacks.

Use language understandable by a non-technical operations leader.

Add a short AI-assistance disclosure.

## PHASE 11 — README

Create an excellent root README.md.

Include:

Problem
Solution overview
Screenshots placeholder if appropriate
Architecture
Tech stack
How to run
How to test
Sample merchant
API endpoints
Reconciliation rules
Assumptions
Accessibility
AI explanation design
Trade-offs
Production improvements
AI-tool usage disclosure

Keep it concise enough that a reviewer can understand the project in approximately five minutes.

Production improvements may include:

database-backed ingestion
real authentication/session context
RBAC
background reconciliation processing
reconciliation versioning
audit trails
observability
rate limiting
PII controls
multi-currency treatment
idempotent ingestion
large-dataset pagination/database indexes

Do not pretend these were implemented.

## PHASE 12 — Final Engineering Review

Act as a Rapyd Staff Engineer reviewing this take-home.

Do NOT immediately change code.

Inspect the entire repository.

Score it from 1–10 for:

Product judgment
Payments/reconciliation correctness
TypeScript quality
Backend architecture
API design
React architecture
Testing
Accessibility
Security/merchant isolation
AI safety/design
Documentation
Maintainability

Then identify:

P0 — issues that could cause rejection
P1 — important fixes
P2 — polish

Specifically search for:

hardcoded reconciliation results
merchant data leakage
money floating-point errors
duplicate-handling bugs
currency aggregation bugs
business logic in controllers
business logic in React components
unvalidated query parameters
weak error states
inaccessible interactive table rows
test gaps
LLM hallucination risk
unnecessary architecture
dead code
inconsistent naming

Fix P0 issues first.

Then fix P1 issues if they materially improve the submission.

Avoid spending time on cosmetic P2 changes unless trivial.

Run:

tests
typecheck
lint
production build

Give me a final submission-readiness report.

## PHASE 13 — Live Interview Preparation

Now stop coding.

Act as the Rapyd interviewer conducting the 60-minute live review.

Read the repository first.

Prepare the 25 most likely questions about my actual implementation.

Focus heavily on questions such as:

Why did you define reconciliation this way?
What happens with duplicates?
Why compare net amount instead of gross amount?
What if currencies differ?
How do you avoid merchant data leakage?
Why didn't you use Redux?
How does this work with 10 million transactions?
How would CSV ingestion change in production?
How would you make reconciliation asynchronous?
What happens when settlement data arrives late?
How would you make reconciliation idempotent?
How would you audit rule changes?
Why is the LLM not deciding reconciliation?
How do you protect merchant financial data sent to an LLM?
What happens if the LLM hallucinates?
How would this integrate with real authentication?
How would you monitor this portal?
What metrics would you send to the Head of Merchant Support?
How did you address accessibility?
What trade-off did you intentionally make?
What would you do with another week?

For each question provide:

- what the interviewer is testing
- a strong 1–2 minute answer based strictly on this repository
- follow-up questions they may ask

Flag anything in the code that I should not claim or cannot defend.
