# 25 Likely Interview Questions

Grounded in this repository as it stands after Phase 12. Section order roughly follows
MASTER_PROMPT's own list; the last 4 are additional questions specific to choices this repo
makes that a sharp interviewer would likely probe.

---

## 1. Why did you define reconciliation this way?

**Testing:** whether the candidate can articulate a design decision from first principles, not
just recite what the code does.

**Answer:** Reconciliation is keyed by `merchantId + transactionId`, never `transactionId` alone,
because transaction IDs aren't guaranteed unique across merchants — using the composite key
structurally prevents cross-merchant collisions rather than relying on every caller to remember
to filter. For each key, at most one exception is produced, decided by a fixed precedence order:
duplicate ledger entries first (because a structural double-entry problem shouldn't also surface
as a false amount mismatch), then missing-side checks, then currency mismatch, then amount
mismatch, then date mismatch, and if none apply, matched. The precedence order matters because a
messy real-world record can trigger multiple conditions at once, and the order decides which one
the merchant actually sees — I ordered it from "most structurally wrong" to "most cosmetically
wrong" so the exception a merchant sees is the most actionable one, not just the first one a naive
loop happened to check.

**Follow-ups:** "What if two rules could both apply — walk me through a concrete example." (Answer
with T1008: it has a duplicate ledger entry; even if one of the duplicates also happened to match
the settlement amount, DUPLICATE_LEDGER still wins because it's checked and `continue`s first.)
"Why one exception per transaction instead of reporting all applicable issues?" (Simpler mental
model for the merchant — one clear cause, one clear next step — and it avoids the ambiguity of a
merchant not knowing which of several listed issues is the "real" one.)

---

## 2. What happens with duplicates?

**Testing:** correctness under a specific, real edge case actually present in the sample data
(T1008), and whether the candidate remembers a UX detail beyond just the backend rule.

**Answer:** If more than one ledger entry exists for the same `merchantId + transactionId`, the
engine flags it as `DUPLICATE_LEDGER` and stops evaluating any other rule for that key — it
doesn't try to match either duplicate against the settlement, because that could either mask the
real problem (one duplicate matches, one doesn't, so the "amount mismatch" logic would fire
inconsistently) or misreport it as two separate, unrelated-looking exceptions. Ledger entries are
sorted by `ledgerId` ascending so "the first entry" is a deterministic choice, not
insertion-order-dependent. The exception carries all duplicate ledger rows (`duplicateLedgerEntries`),
and the frontend's exception drawer renders every duplicate row side by side, not just one — that
was a gap I found and closed in Phase 6 after noticing the original mockup only showed one.
Financially, a duplicate has no quantifiable "impact" number reported — I deliberately treat that
as undefined rather than guessing whether the money is doubled or not, since that requires human
judgment, not an engine's number.

**Follow-ups:** "What if there were 3+ duplicates?" (Same rule — `duplicateLedgerEntries.length > 1`
is the only condition checked, and all entries are carried through and rendered, not just two.)
"Why not compute a financial impact for duplicates?" (Reporting a number implies confidence about
whether it's a real double-payment or a data-entry artifact — that's exactly the kind of false
precision `docs/product-spec.md` §15 explicitly calls out as a risk to avoid.)

---

## 3. Why compare net amount instead of gross amount?

**Testing:** domain understanding of what a settlement actually represents in a payments context,
not just that the code compiles.

**Answer:** The settlement's net amount (gross minus the processor's fee) is what actually lands
in the merchant's ledger — that's what a merchant's own bookkeeping records as "received." Gross
amount comparison would produce a false mismatch on every single transaction, since the fee
difference would show up as a phantom discrepancy on 100% of correctly-processed transactions.
Comparing net-to-ledger is the only comparison that reflects reality; I documented this explicitly
as an assumption (`docs/product-spec.md` assumption 4) precisely because it's not obvious from the
field names alone, and a reviewer without payments context might reasonably ask "why net and not
gross" — which is this exact question.

**Follow-ups:** "What if the ledger recorded gross instead of net for some merchants?" (That would
be a real data-modeling question to raise with product before shipping — the current assumption is
that the ledger always records net, based on the sample data; if that assumption were wrong for
some merchant configuration, every transaction for that merchant would show a spurious
AMOUNT_MISMATCH equal to the fee, which would be a strong signal the assumption needs revisiting,
not silent failure.)

---

## 4. What if currencies differ?

**Testing:** whether defensive code exists for a case the sample data doesn't actually exercise —
tests real vs. token engineering.

**Answer:** `CURRENCY_MISMATCH` is checked explicitly, before the amount comparison, precisely
because comparing minor-unit integers across currencies is meaningless — 26780 minor units of USD
and 26780 minor units of AED are not "equal," and treating them as comparable would produce a
nonsensical difference number. It's implemented and unit-tested even though the current M-104
sample data never actually triggers it — I added it defensively because currency mismatches are a
real category of reconciliation problem in payments, not a hypothetical, and I'd rather have the
rule exist and be dormant than have it missing and discovered in production. One honest caveat:
the merchant-facing copy for this reason (`exceptionLabels.ts`) is original content I wrote,
not reviewed by product the way the other five reasons in `docs/product-spec.md` §9 were — I've
flagged that explicitly as an open item.

**Follow-ups:** "Where in the precedence order does it sit, and why there?" (Checked after the
missing-side checks — there's nothing to compare currency against if one side doesn't exist — but
before amount mismatch, since amount comparison across currencies would be the actual bug this
rule prevents.)

---

## 5. How do you avoid merchant data leakage?

**Testing:** the single most important security property of this system — this is the question
I'd expect to be probed hardest and most skeptically.

**Answer:** The authenticated merchant ID is resolved once, by server-side middleware
(`attachMerchantContext`), and attached to the request object — every controller reads
`req.merchantId`, never `req.query`, `req.body`, or `req.params`. There's a code comment directly
in the controller enforcing this as a rule, not just a convention. The reconciliation engine's own
key is `merchantId + transactionId`, so even a lookup by transaction ID alone can't cross merchant
boundaries — `getExceptionById(merchantId, transactionId)` filters by both, so requesting a
transaction ID that belongs to a different merchant correctly returns 404, not that merchant's
data. In this take-home, the "authentication" is a mock — middleware hardcodes `merchantId = 'M-104'`
standing in for a real session/token layer — but the isolation boundary itself (never trust a
client-supplied merchant ID) is real and structural, not something a real auth system would need
to retrofit; it would just replace the mock middleware with one that decodes a real session token.

**Follow-ups:** "Show me the exact line where you'd swap in real auth." (`merchantContext.ts` —
`attachMerchantContext` currently hardcodes the ID; a real version decodes a JWT/session cookie and
sets the same `req.merchantId` field, and nothing downstream changes.) "What if someone tampered
with a URL query param hoping to see another merchant's data?" (There is no merchant ID anywhere in
a query param, route param, or body for the API to accidentally trust — it's simply not part of the
request contract.)

---

## 6. Why didn't you use Redux?

**Testing:** whether the candidate over-engineers state management or has a principled boundary —
a classic "did you use it because you know it, or because you understood when not to" question.

**Answer:** I did use Redux Toolkit, but scoped narrowly — only for transient, non-shareable UI
state that shouldn't survive a refresh or be linkable, specifically the exception drawer's
open/selected-transaction state. Server data lives entirely in TanStack Query, which already
handles caching, loading/error states, and refetching — duplicating that into Redux would just be
two sources of truth to keep in sync for no benefit. Filters, sort, and pagination live in the URL
via `useSearchParams`, not Redux or component state, because the product requirement was that a
filtered view be shareable and survive a page refresh — URL state gives you that for free, Redux
doesn't. So the honest answer is "I used exactly the amount of Redux the state actually warranted,"
which per the assessment brief's own wording ("Redux or an equivalent if the state genuinely
warrants it") was the actual ask — not zero, not everywhere.

**Follow-ups:** "What would happen if you put the filters in Redux instead of the URL?" (You'd
lose shareable/bookmarkable links and refresh-survival, and you'd need to manually sync Redux
state back into the URL anyway to get those properties back, which is strictly more code for a
worse result.) "What's the one Redux slice and what does it hold?" (`uiSlice` — drawer open state
and the currently-selected transaction ID, nothing else.)

---

## 7. How does this work with 10 million transactions?

**Testing:** whether the candidate understands the current implementation is a demo-scale choice,
not a scaling claim — and can reason about what specifically breaks first.

**Answer:** Honestly, it doesn't, as built — and I'd say that plainly rather than defend it. The
current repository reads two CSVs into memory once per process and reconciles the entire dataset
synchronously in one pass, caching the result in a module-level `Map`. At 10 million transactions
that's a multi-gigabyte in-memory dataset per process, a reconciliation pass that blocks the event
loop for however long that takes, and pagination that's just array-slicing an already-fully-loaded
result set. The specific things that would need to change: the reconciliation engine's pure
function itself is actually fine as-is — it's a single pass with O(n) grouping, no quadratic
behavior — the problem is everything around it. I'd move CSV ingestion to a streaming
parser instead of reading a whole file into memory, push the reconciled result into a real
database with indexes on `(merchantId, transactionId)`, replace the in-memory cache with database
queries so the API layer stops holding the whole dataset in process memory, and run reconciliation
as a background batch/streaming job rather than inline with a page load. The `packages/shared`
engine's signature (`reconcile(settlements, ledgerEntries)`) would still work as the unit of
business logic even at that scale — you'd just call it per-batch instead of once over everything.

**Follow-ups:** "Which part would you fix first?" (Getting the dataset out of process memory and
into a database — that's the change that unblocks everything else, including pagination that
doesn't require loading all 10M rows to serve one page.) "Is the matching algorithm itself
O(n) or worse?" (O(n) — it's a single grouping pass by key plus a per-key rule evaluation, no
nested loops over the full dataset.)

---

## 8. How would CSV ingestion change in production?

**Testing:** practical understanding of the difference between a take-home's deliberately minimal
parser and a production-grade one.

**Answer:** The current `parseCsv` in `packages/shared/src/parsing.ts` is deliberately minimal — no
quoted-field or embedded-comma support, because the provided sample CSVs don't need it, and I
said so directly in the code comment rather than pretending it's production-ready. In production
I'd swap it for a real CSV parser (`csv-parse` or similar) that handles quoting, escaping, and
malformed rows without silently misaligning columns. I'd also move from "read the whole file into
memory with `readFileSync`" to streaming row-by-row, since settlement/ledger exports at real scale
won't fit in memory. And I'd add real validation and dead-letter handling for malformed rows —
right now a bad row would either throw (for a genuinely invalid amount string, since
`parseAmountToMinorUnits` validates its input format strictly) or silently default (for a missing
column, since the row-mapping functions use `?? ''`) — in production I'd want malformed rows
quarantined and reported, not defaulted silently.

**Follow-ups:** "What happens today if a row has a malformed amount?" (`parseAmountToMinorUnits`
throws on anything that doesn't match the decimal pattern — that's a programmer/data error, not a
reconciliation outcome, consistent with `docs/architecture.md` §7's rule that the engine only
throws for malformed input shape, never for "the data reconciles badly.")

---

## 9. How would you make reconciliation asynchronous?

**Testing:** systems thinking beyond what's implemented — this is a "next iteration" design
question, not a "what does the code do" question.

**Answer:** Today reconciliation runs synchronously and inline — the first request after process
start pays the cost of reading and reconciling both CSVs, then every subsequent request reads from
a cached `Map`. To make it asynchronous, I'd decouple "data arrives" from "data is reconciled" —
ingestion would write raw settlement/ledger records to a database or queue, a separate worker
process would run the reconciliation engine over new/changed records (the pure function in
`packages/shared` doesn't need to change at all for this — it's already side-effect-free and
synchronous by design, so it slots into a worker unchanged), and results would be persisted so the
API layer only ever reads pre-computed results, never triggers reconciliation itself. That also
naturally solves the 10M-transaction problem, since you're incrementally reconciling new records
rather than re-running the whole dataset on every request.

**Follow-ups:** "Why is the engine already suited to this without changes?" (Because it's a pure
function — same inputs, same outputs, no I/O, no hidden state — which is exactly the property that
makes code portable between a request handler and a queue worker without modification;
`docs/architecture.md` §3 calls this out as a deliberate design goal, not an accident.)

---

## 10. What happens when settlement data arrives late?

**Testing:** whether the candidate has thought about a real operational scenario (settlement
files often lag ledger entries) versus only the artificial completeness of the sample CSVs.

**Answer:** As built, "late" and "missing" look identical to the engine — if a ledger entry exists
with no matching settlement at reconciliation time, it's flagged `MISSING_SETTLEMENT`, regardless
of whether the settlement will show up five minutes later or never. That's actually reflected in
the merchant-facing copy already: the `MISSING_SETTLEMENT` next-step text says "This may indicate
a pending settlement... if the transaction is older than your typical settlement cycle, contact
support" — acknowledging that a missing settlement isn't necessarily wrong, just possibly not-yet-
arrived. What's missing today is any actual time-awareness: the engine has no concept of "how long
has this been missing" — that would need a timestamp on when reconciliation last ran plus the
transaction's own date, and a rule like "don't even surface MISSING_SETTLEMENT as an exception
until it's been outstanding longer than the typical settlement cycle," to avoid alarming a merchant
about something that's still in-flight. That's a real product decision I didn't have data to make
confidently in this take-home, so I left it as "exception exists but the copy manages
expectations," rather than guessing at a specific SLA window.

**Follow-ups:** "How would you implement the time-window suppression?" (Add a "first observed
missing at" timestamp when persisting reconciliation state — which requires the async/persisted
architecture from Q9 — and only classify it as a merchant-visible exception once it's exceeded a
configurable grace period.)

---

## 11. How would you make reconciliation idempotent?

**Testing:** whether the candidate understands idempotency isn't automatic just because a function
is "pure," and can name the actual mechanism.

**Answer:** The core engine already is idempotent in the sense that matters most: it's a pure
function of its inputs, so re-running `reconcile(settlements, ledgerEntries)` on the same two
datasets always produces the same result — no hidden counters, no mutation of input records. The
part that would need explicit design is the persistence layer once this becomes database-backed
and incremental (per Q9): if settlement data for a transaction is re-ingested (say, a settlement
file is redelivered after a network retry), I'd want ingestion keyed by a natural key
(`merchantId + transactionId + settlementId`) with an upsert, not an insert, so redelivery doesn't
create a duplicate settlement record that would then spuriously trigger something like
`DUPLICATE_LEDGER`'s sibling problem on the settlement side. The reconciliation pass itself, run
against the same persisted state twice, should produce the same set of exceptions both times — that
property falls directly out of the engine already being pure.

**Follow-ups:** "What's the difference between the engine being idempotent and the whole pipeline
being idempotent?" (The engine's purity guarantees "same inputs → same outputs." Pipeline
idempotency additionally requires that redelivering the same source data doesn't change what those
inputs are — that's an ingestion-layer concern, not something the engine itself can guarantee.)

---

## 12. How would you audit rule changes?

**Testing:** payments-specific maturity — reconciliation rules are the kind of logic that gets
audited by compliance, not just code-reviewed.

**Answer:** Today, the rule precedence and its rationale live as a doc comment directly above
`reconcile()` in `reconcile.ts` — genuinely the source of truth, not a paraphrase that could drift
from the code, since it's compiled alongside it. For a real audit trail beyond "read the git
history," I'd want: every rule change to go through the same PR/review process as anything
financial, with the reconciliation engine's unit tests (already the highest-coverage, most
exhaustive tests in the repo — 28 tests over a small pure module) required to cover the new
behavior before merge; a changelog entry specifically for rule changes, separate from routine
CHANGELOG entries, since "we changed what counts as a mismatch" is a materially different kind of
change than "we redesigned a button"; and ideally a way to re-run historical data through both the
old and new rule versions before a rule change ships, so you can see exactly which past exceptions
would have been classified differently — that's the kind of diff a compliance reviewer would
actually want to see, and it's not built today.

**Follow-ups:** "Why is the rule precedence a doc comment and not a config file?" (Because the
order encodes actual dependencies between checks — e.g. currency must be checked before amount
comparison is even meaningful — it's not an arbitrary ordering a config file could safely
reorder without understanding those dependencies; making it "configurable" would let someone
introduce a logically inconsistent rule order without the type system or tests catching it.)

---

## 13. Why is the LLM not deciding reconciliation?

**Testing:** the single most important AI-safety property in this build — expect this to be
probed as hard as merchant isolation.

**Answer:** Because reconciliation is a factual, auditable determination about a merchant's money,
and an LLM's job here is explicitly the opposite of that — it's non-deterministic, it can't be held
to the same test-coverage bar as `reconcile.ts`'s 28 unit tests, and if it were ever wrong, there's
no way to audit why. So the boundary is structural, not policy: `reconcile()` in `packages/shared`
has zero dependency on anything LLM-related — it doesn't call it, import it, or receive any input
from it. It decides whether an exception exists, its reason, and its exact amounts, entirely
before an explanation is ever requested. The `ExceptionExplanationProvider` interface
(`explanationProvider.ts`) only ever receives a 7-field `ExplanationContext` built from an
already-decided `ReconciliationException` — it turns already-decided facts into merchant-friendly
prose, and has no path to introduce a new fact, change an amount, or reclassify an exception. Even
in the worst case — the mock (or a future real LLM) fails or hallucinates — the merchant still sees
the correct, deterministic reconciliation result; only the wording of the explanation is at risk,
never the underlying facts.

**Follow-ups:** "What would have to be true for you to trust an LLM with an actual decision here?"
(I wouldn't, for this class of decision — see `docs/ai-design.md` §7's "what should not ship on
this pattern": anything where the AI's output could change what a merchant does next in a way that
matters, like a dispute recommendation, is a fundamentally different risk profile than "phrase this
calmly," and I'd want a much more conservative review process, likely still with a human in the
loop, before ever letting a model output be more than advisory there.)

---

## 14. How do you protect merchant financial data sent to an LLM?

**Testing:** data-minimization thinking specific to sending data to a third party.

**Answer:** The `ExplanationContext` DTO is the entire protection mechanism — it's a strict
7-field shape (`transactionId`, `reason`, `currency`, settlement amount+date, ledger amount+date,
difference amount, duplicate count) built by `buildExplanationContext`, and nothing else on the
`ReconciliationException` object is ever passed to a provider. There's no merchant name, no
account or routing numbers, no customer PII — because none of that exists on the domain object in
the first place, so there's nothing to accidentally leak even if the context builder had a bug.
The transaction ID is the one quasi-identifying field that would reach a real third-party LLM
provider if one were wired in — I flagged that explicitly in `docs/ai-design.md` §6 as a
data-processing-agreement question for whichever vendor gets chosen, rather than silently assuming
it's fine, since that's genuinely outside what a take-home can decide unilaterally.

**Follow-ups:** "What if a real provider needed more context to give a better explanation?" (I'd
push back on that request and ask what specific field is actually needed and why — the whole safety
property here depends on the context staying minimal; expanding it should require the same
scrutiny as adding a new field to a security audit log, not be treated as a routine prompt
improvement.)

---

## 15. What happens if the LLM hallucinates?

**Testing:** whether the two-layer defense (grounding + validation) is understood as two
independent things, not one control being described twice.

**Answer:** Two independent things have to both fail for a hallucination to reach a merchant, and
I built them as genuinely separate layers rather than one control described two ways. First,
structural grounding bounds what the provider can even talk about — it's physically handed only
the 7-field context, so it can't hallucinate a fact about a transaction it was never told about,
only mis-phrase or embellish the facts it was given. Second, independent of whether the provider
succeeded, `explanationService.ts`'s `isUsable` check validates the actual output: length bounds
(10-600 characters) catch truncated or runaway text, and a banned-language regex rejects any result
containing words like "fraud," "stolen," "lost," "missing funds," "liability," or "money is
missing" — the exact alarmist language CLAUDE.md's calm-language rule forbids, regardless of
whether the model produced it while trying to be "helpful" or just drifted there. If either the
provider throws or its output fails that check, `getExplanation` falls through to
`buildDeterministicExplanation` — the same pre-reviewed, reason-keyed text that was the Phase 4
placeholder — and the response is tagged `generatedBy: 'fallback'` so the frontend shows a plain
"Standard explanation" badge instead of claiming AI involvement that didn't actually produce the
text shown.

**Follow-ups:** "Walk me through what's actually tested for this." (`explanationService.test.ts`
exercises both failure modes directly — a provider that returns alarmist language, and one that
returns implausibly short/long output — and asserts both correctly fall back rather than being
shown.) "Why a regex list instead of a second LLM call to judge the first one's output?" (Simple,
deterministic, and fully unit-testable — a second model call to police the first introduces its
own hallucination risk and non-determinism into what's supposed to be the safety net.)

---

## 16. How would this integrate with real authentication?

**Testing:** whether the mock boundary is understood as a real seam, not a shortcut baked
throughout the code.

**Answer:** `attachMerchantContext` in `merchantContext.ts` is the single point of integration —
it currently hardcodes `req.merchantId = 'M-104'` standing in for a real session. A real version
would decode a session cookie or JWT (however Rapyd's actual auth is implemented), resolve the
authenticated merchant from that token's claims, and set the exact same `req.merchantId` field.
Nothing downstream — controllers, services, the reconciliation repository — would need to change
at all, because every one of them already reads `req.merchantId` and never anything client-supplied.
That's the point of putting this in middleware rather than a helper function controllers remember
to call: it's structurally impossible to reach a controller without merchant context having
already been resolved server-side.

**Follow-ups:** "What if the token is invalid or expired?" (That's exactly the kind of thing this
middleware would need to handle by rejecting the request — e.g. a 401 — before ever reaching a
controller; today's mock middleware has no failure path because it never fails, which is honestly a
gap a real version would need to close, not something to claim already works.)

---

## 17. How would you monitor this portal?

**Testing:** operational maturity — distinguishing between "it has tests" and "you'd know if it
broke in production."

**Answer:** Nothing is instrumented today — there's no logging infrastructure in `apps/api` at
all, which I stated plainly in `docs/ai-design.md` §5 rather than pretend otherwise. What I'd add
first: structured request logging with merchant ID, endpoint, status code, and latency, so a spike
in 500s or a specific endpoint's latency is visible; explicit metrics on the explanation feature
specifically — provider success rate, fallback rate split by _reason_ (provider-threw vs.
output-failed-validation, which currently both collapse into the same code path but represent very
different signals: one's an infrastructure problem, the other means the model's output is drifting
into unsafe territory and needs review); and reconciliation-run metrics — how many exceptions were
generated per run, broken down by reason, so a sudden spike in `AMOUNT_MISMATCH` count would be a
signal worth investigating before a merchant even complains. Error boundaries in the frontend and
the `errorHandler` middleware in the backend are the only "if something breaks" surface today —
they degrade gracefully to a friendly message, but nothing alerts a human that it happened.

**Follow-ups:** "Which metric would you want paged on first?" (Explanation fallback rate spiking
specifically for the "output failed validation" reason, not the "provider threw" reason — an
infrastructure blip self-resolves, but a model starting to produce alarmist or malformed output
consistently is a correctness/trust issue that needs a person to look at it.)

---

## 18. What metrics would you send to the Head of Merchant Support?

**Testing:** cross-functional communication — can the candidate translate engineering state into
something a non-technical stakeholder cares about (this is literally what `docs/stakeholder-memo.md`
required, so this question checks whether that thinking is retained, not just documented once).

**Answer:** Per `docs/stakeholder-memo.md`, the headline metric is a support-contact-reduction
estimate — how many merchant support tickets that previously required a human to explain "why does
this look off" are now resolved by the merchant reading the dashboard themselves, ideally split by
exception reason so support can see which categories still generate the most contacts (a strong
signal for where the merchant-facing copy or the underlying process itself needs more work, not
just more dashboard polish). I'd also want exception volume and financial-impact-by-currency
trends over time — not to alarm, but so support can proactively flag a merchant with a growing
exception backlog before that merchant calls in confused. And specifically for the AI explanation
feature, the fallback rate — if a meaningful fraction of explanations are falling back to the
generic deterministic text instead of a tailored one, that's worth knowing even though the merchant
experience doesn't visibly break, because it means the "smarter" experience isn't actually landing
as often as intended.

**Follow-ups:** "Why financial-impact-by-currency and not a single combined number?" (Because
combining currencies into one number would require a conversion rate assumption that isn't
part of this data — reporting per-currency, as the engine already does, avoids manufacturing a
number the data doesn't actually support.)

---

## 19. How did you address accessibility?

**Testing:** depth beyond "I added some ARIA attributes" — expects the Phase 9 review to be
described as an actual audit with a real finding, not a checklist exercise.

**Answer:** I ran a dedicated Phase 9 audit rather than treating accessibility as incidental to
building the UI, and it surfaced a genuine, previously-undetected bug: the drawer's focus trap
(`useFocusTrap.ts`) used `querySelectorAll` to find focusable elements, which matches elements
regardless of whether a real Tab keypress could actually reach them — specifically, the drawer's
inactive tab panels were `hidden` but still carried `tabIndex={0}`, so they matched the selector.
That meant the trap's computed "last focusable element" was sometimes one a user could never
actually tab to, so the wrap-back-to-first condition could never fire, and focus escaped the entire
modal to the page behind it. I found this by literally driving the app with Playwright through a
full Tab cycle and logging `document.activeElement` at each step — not by reading the code, which
looked correct — and fixed it by filtering out any element inside a `hidden` ancestor before
computing first/last. I verified the fix mattered by deliberately reverting it, confirming the
regression test failed with the exact live-bug symptom, then restoring it — I don't trust a
regression test until I've watched it fail. Beyond that: I computed WCAG AA contrast ratios exactly
(a small script implementing the luminance/contrast formula) rather than eyeballing colors, and
found two tokens inherited from the approved design that actually failed — `--color-text-muted`
at 2.54:1 against a 4.5:1 requirement, and `--color-border-strong` at 1.47:1 against a 3:1
requirement — both one-line fixes once measured precisely. And I added heading structure that was
almost entirely missing before this pass — the whole dashboard had exactly one `<h1>` and nothing
else.

**Follow-ups:** "Why didn't code review alone catch the focus-trap bug?" (Because the code's logic
was internally consistent and looked correct in isolation — the bug only existed in the _interaction_
between the focus trap's element-finding and the tab-panel's `hidden`-but-still-tabbable markup,
which is exactly the kind of bug that only a live, interactive test surfaces, not a static read.)
"What accessibility work is intentionally not done?" (See `docs/interview-prep/do-not-claim.md` and
`docs/accessibility.md`'s "Deliberately not done" — roving tabindex for the tab pattern, and
`inert` on background content during the modal, were both considered and explicitly deferred, not
missed.)

---

## 20. What trade-off did you intentionally make?

**Testing:** self-awareness about scope — every senior engineer makes trade-offs; the interesting
signal is whether they can name one precisely and defend _why_, not just list it.

**Answer:** The clearest one: no responsive/mobile audit. The design pass added a 2-column
summary-card fallback at narrow widths as a side effect of applying the approved visual design, but
I never did a deliberate pass over the exceptions table, filter toolbar, or drawer at small
viewport widths — those are the components most likely to actually break on a phone (a dense
sortable table and a side-drawer are both awkward patterns at narrow widths). I made that trade-off
because the assessment brief and MASTER_PROMPT's phases are explicitly desktop-oriented — a
merchant-facing B2B reconciliation dashboard reviewed by finance/ops staff is a reasonable
desktop-first assumption — and I judged that time was better spent on the accessibility audit
(Phase 9) and the AI-safety design (Phase 8), which were both explicitly scoped phases, than on an
audit nobody asked for. I flagged it explicitly in `docs/project-overview.md`'s "Known open gaps"
rather than silently shipping it and hoping it wouldn't come up.

**Follow-ups:** "If you had to guess what breaks first on mobile, what would it be?" (The
exceptions table — it has 6 columns including two numeric ones, and the current CSS doesn't have a
narrow-width strategy for it beyond horizontal scroll, which is a real but not catastrophic
degradation; the drawer's fixed side-panel width is the second candidate.)

---

## 21. What would you do with another week?

**Testing:** prioritization — a well-calibrated answer names the _highest-leverage_ gaps, not just
the longest list.

**Answer:** In priority order: first, close the responsive/mobile audit gap (Q20) — it's the
clearest "would actually embarrass this in front of a real merchant" gap. Second, write real
per-journey Playwright e2e specs — right now there's one smoke spec, and the dashboard has existed
since Phase 5, so the journeys worth covering (filter → sort → paginate → open drawer → view AI
explanation → export) are well-defined but untested end-to-end, only unit-tested per component.
Third, add the logging/observability split described in `docs/ai-design.md` §5 — provider-failure
vs. validation-failure as distinct, alertable outcomes — since that's a small, well-scoped change
that meaningfully improves production-readiness of the one feature (AI explanations) that's the
most novel and highest-risk part of this build. Fourth, get product review on the
`CURRENCY_MISMATCH` copy, since it's the one piece of merchant-facing language in the whole system
that wasn't reviewed the way the original five reasons were. I'd deliberately _not_ spend the week
on cosmetic polish or new features — the gaps above are all things a real production rollout would
actually need, not nice-to-haves.

**Follow-ups:** "Why e2e specs over the mobile audit, if you had to pick only one?" (Honestly, the
mobile audit first — it affects every real user's actual experience today, where the e2e specs are
a safety net against future regressions; I ordered the list by "most likely to visibly hurt a real
merchant," and mobile ranks higher than test coverage for a feature that already works.)

---

## 22. Why Jest for `apps/web` when Vite is the bundler — wouldn't Vitest be more natural?

**Testing:** attention to explicit constraints versus "best practice by default" — this is a
"did you read the brief" question disguised as a tooling question.

**Answer:** An earlier version of this repo actually did use Vitest, for exactly the reason you're
implying — it's Vite-native and shares the dev server's transform pipeline, which is the more
natural default for a Vite project. I changed it after re-auditing the assessment brief against its
literal wording, which specifies "Tests: Jest + React Testing Library covering your exceptions
table" — naming Jest specifically, not "a modern test runner." Continuing with Vitest after
noticing that would have been an unnecessary, unrequested deviation on something the brief was
explicit about, so I corrected it even though it meant giving up Vitest's tighter Vite integration.
Jest runs against the TypeScript/JSX via `babel-jest`, with `tsc --noEmit` still doing full type
checking separately in the `typecheck` script, since Babel only strips types rather than checking
them.

**Follow-ups:** "Did switching cost you anything technically?" (Some — Babel-based transforms don't
share Vite's exact resolution behavior, so a couple of import-path or CSS-module-mock details
needed adjusting when I made the switch, but nothing that affected what was actually being tested.)

---

## 23. Walk me through why money is never a float in this codebase.

**Testing:** whether the candidate can explain the _mechanism_, not just recite "floats are bad for
money" as a slogan.

**Answer:** `0.1 + 0.2 !== 0.3` in IEEE 754 floating point — that's not a hypothetical edge case,
it's the default behavior of the type, and a reconciliation engine whose entire job is detecting
_exact_ mismatches cannot afford arithmetic that introduces its own imprecision. So amounts are
parsed exactly once, at the CSV boundary, from decimal strings like `"267.80"` into integer minor
units — `26780` — using string manipulation only: split on the decimal point, pad the fraction to
two digits, and combine as an integer. Critically, this is _not_ `parseFloat(decimal) * 100`,
which would reintroduce exactly the error being avoided, since the float multiplication happens
before you ever get to the integer domain. Every comparison and arithmetic operation downstream —
the engine's `!==` checks, the difference calculation, the summary's per-currency totals — happens
entirely in that integer domain. Conversion back to a decimal string for display
(`formatMinorUnitsAsDecimal`) is also done via integer division and modulo, never by dividing by
100 as a float and hoping rounding doesn't bite. This rule is applied with zero exceptions across
the codebase, including inside the AI-explanation context builder, which still calls
`formatMinorUnitsAsDecimal` rather than taking a shortcut.

**Follow-ups:** "What would go wrong concretely if you used floats?" (Two settlement records that
are actually identical in decimal terms could compare as unequal after floating-point arithmetic,
producing a false `AMOUNT_MISMATCH` exception for a transaction that's actually fine — exactly the
kind of false alarm that erodes merchant trust in the dashboard.)

---

## 24. Why does the frontend never call the reconciliation engine directly — why go through an API at all?

**Testing:** architectural boundary reasoning — checks whether the API layer is understood as a
deliberate trust and information boundary, not incidental to "how React apps usually work."

**Answer:** Two separate reasons, and both matter. First, security: the reconciliation engine reads
CSVs from disk and has no concept of "who's asking" — if the frontend could call it directly (say,
by bundling it and running it in the browser against fetched raw data), there'd be no server-side
enforcement point for merchant isolation at all; the browser would need to be trusted to only ask
for its own merchant's data, which is not a trust boundary you can enforce client-side. Putting the
engine behind a REST API means the _server_ decides which merchant's data a request can even see,
via `req.merchantId`, before the engine or any data reaches the response. Second, honesty about
what the frontend actually knows: `apps/web` only imports `packages/shared`'s _types_, for typing
API responses, and a typed fetch client — never the CSV readers or the engine itself. That keeps
the frontend's knowledge limited to exactly what the API chooses to expose, which is also what
makes it possible to swap the CSV-backed repository for a real database later (`docs/architecture.md`
§9) without the frontend needing to change at all — it was never coupled to how the data is sourced.

**Follow-ups:** "Could the reconciliation engine run in the browser for a demo mode, hypothetically?"
(Technically yes, since it's framework-free pure TypeScript with no Node dependencies — but I
wouldn't do it for this product, because the moment you're reconciling real merchant financial data,
you want the trust boundary to be the server, not "the browser promises to behave.")

---

## 25. Tell me about a real bug you found in your own review process — walk me through it end to end.

**Testing:** whether the candidate can narrate a debugging process honestly (including what didn't
work / what looked right but wasn't), which is a much stronger signal than reciting a fix.

**Answer:** This is the Phase 9 focus-trap bug (also the answer to Q19, but worth narrating as a
process). The drawer's focus trap looked correct on a code read: on Tab, if focus was on the last
focusable element, wrap to the first; on Shift+Tab from the first, wrap to the last. That logic is
genuinely right — the bug wasn't in the wrap condition, it was in what counted as "the last
focusable element" in the first place. The drawer had just gained a tabbed layout (Details /
Settlement vs. Ledger / AI Explain), and each inactive tab panel was marked `hidden` but still had
`tabIndex={0}` on some of its children — a real browser correctly never lets Tab land on content
inside a `hidden` ancestor, but `querySelectorAll('[tabindex]:not([tabindex="-1"])')` doesn't know
or care about the `hidden` attribute; it matched those elements anyway. So the trap's computed
"last" element was sometimes one nobody could actually tab to, which meant the wrap-to-first
condition (`document.activeElement === last`) could never become true, and Tab from the real last
reachable element just... left the dialog, landing on whatever was next in the underlying page's
tab order. I didn't find this by reading the code a second time — I found it by literally driving
the running app with Playwright through a complete Tab cycle and logging `document.activeElement`
at every step, which is what made "focus lands on `<body>` or a background element" visible as a
symptom in the first place. The fix was a single predicate — `isReachable(element)` checks
`element.closest('[hidden]') === null` — applied to both the initial-focus lookup and the
Tab-handler's element list. And critically, I didn't trust the fix until I'd watched it fail: I
temporarily reverted `isReachable` to always return `true`, re-ran the new regression test, watched
it fail with the exact live-bug symptom, then restored the real fix and watched it pass. That
revert-confirm-restore step is something I do specifically for bug-fix regression tests, because a
test that "passes with your fix" only proves something if you've also seen it fail without the fix.

**Follow-ups:** "Why not just add `tabindex=-1` to elements inside hidden panels instead of
filtering in the trap?" (That would also work and is arguably more standard — I chose the
`isReachable` filter because it fixes the trap's logic at the one place that actually needs to be
correct, without requiring every current and future piece of markup inside a tab panel to
remember to manage its own `tabindex` correctly; it's a single, centralized guarantee rather than a
distributed convention every new component has to uphold.)
