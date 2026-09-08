# Settlement Reconciliation Portal — Memo for Merchant Support

**To:** Head of Merchant Support **From:** Engineering (Client Portal) **Re:** What the new
reconciliation portal does, what it doesn't, and how we'll know it's working

## What merchants can now do

A merchant logs in and sees, at a glance, whether their settlements match their own records —
"all clear," or a specific count of items that need a look. For anything that doesn't match, they
can open it and see exactly what's different (amount, date, which entry is the odd one out) in
plain language, not a raw data dump. They can filter by issue type or date range and export their
exceptions to a CSV. All of this works before they ever need to call us.

## What still requires support

The portal shows evidence; it doesn't resolve the underlying issue, and it shouldn't — some of
this is genuinely our call, not something safe to automate. A settlement with no matching
internal record (or vice versa) still needs someone to confirm whether it was actually processed
or is simply still in flight. A transaction recorded twice is shown side by side so the merchant
can see it for themselves, but removing a duplicate is a support action, not a portal action.
Anything a merchant disputes after reading the detail still needs a human to adjudicate. In
short: the portal turns "something's wrong, I don't know what" into "here's specifically what's
different, and my transaction ID" before a merchant reaches out — it does not, and should never
be described as, something that automatically fixes settlement discrepancies.

## The trade-off we made

**We prioritized getting the reconciliation itself right — trustworthy results, a clear state for
every outcome (including "nothing's wrong"), accessibility, and explanations a merchant can
actually understand — over advanced analytics and real-time data.** Every number a merchant sees
comes from fixed, auditable rules, not a best guess. What we deferred: trend charts (is my
exception rate improving?), live/streaming settlement updates (today's data refreshes on a
schedule, not instantly), and letting a merchant start a dispute directly from the portal. Those
are reasonable next investments once the foundation is proven — we didn't want to build
visualization on numbers we hadn't first made trustworthy and explainable.

## How we'll know it's working

**Primary metric: fewer merchant support contacts about settlement/reconciliation questions.**
We'll compare that ticket category's volume against portal adoption (merchants actually logging
in and using it) over the following 30/60/90 days, so we're reading "did the portal reduce
contacts," not just "did volume happen to change." As secondary signals — without diluting the
main number — we'll also watch whether merchants who do contact us ask better-informed questions,
and whether merchants open the portal but leave without checking their exceptions (a UX problem,
separate from ticket reduction).

## About the AI-generated explanations

Each exception's plain-language explanation is generated from the same numbers already on
screen — the amount, the date, the difference — never a guess about what might have happened. It
can't speculate about fraud, lost funds, or liability; it can only describe what the data shows.
If it ever fails to generate, or looks off, the merchant automatically gets a standard,
pre-written explanation instead — never an error, never left without an explanation.

**AI-assistance disclosure:** this project — the reconciliation logic, the portal, and this memo
— was built with Claude Code, an AI coding assistant, under direct review and direction at every
step. How the AI-explanation feature itself is grounded and safeguarded is detailed in
`docs/ai-design.md`.
