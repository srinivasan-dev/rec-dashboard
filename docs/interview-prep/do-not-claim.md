# Things Not To Claim Or Overstate

Per MASTER_PROMPT Phase 13's explicit instruction: "flag anything in the code that I should not
claim or cannot defend." This is the honest inventory — most of these are already self-identified
in `docs/project-overview.md`'s "Known open gaps," repeated here specifically as interview-facing
warnings, not new findings.

## Do not claim this scales

- The reconciliation pipeline reads two CSVs fully into memory once per process and caches the
  result in a module-level `Map`. This is fine for the sample dataset (14 transactions) and
  honestly fine to defend as a deliberate Phase-2/3 scope decision ("no database in this phase" is
  stated directly in `docs/architecture.md` §9) — but do not imply this is a scalable design as
  built. See [questions.md](questions.md) Q7 for the honest scaling answer.

## Do not claim real authentication exists

- `attachMerchantContext` hardcodes `merchantId = 'M-104'`. It is explicitly a mock standing in
  for a real session/token layer — say so plainly if asked how auth works, rather than describing
  the mock as if it were a real implementation with a session store behind it. The isolation
  _boundary_ (never trust a client-supplied merchant ID) is real and structurally enforced; the
  _authentication_ behind it is not.

## Do not claim the mobile/responsive experience was audited

- A 2-column summary-card fallback exists at narrow widths as a side effect of the design
  implementation pass, not from a deliberate audit. The exceptions table, filter toolbar, and
  drawer have not been tested at small viewport widths. Do not say "this is responsive" — say "a
  partial fallback exists; a full audit is a known, undone gap" (see Q20).

## Do not claim per-journey e2e coverage

- There is exactly one Playwright smoke spec. Full user-journey specs (filter → sort → paginate →
  drawer → AI explain → export) are unwritten. The 103 passing tests are real and meaningful, but
  they are unit/integration tests (Jest + RTL + Supertest), not end-to-end journey tests. Don't
  blur that distinction if asked "how well tested is this end to end."

## Do not claim `CURRENCY_MISMATCH`'s copy was product-reviewed

- The five original exception reasons' merchant-facing language came verbatim from
  `docs/product-spec.md` §9. `CURRENCY_MISMATCH` was added later (Phase 3, defensively) and its
  copy in `exceptionLabels.ts` / `deterministicExplanation.ts` / `MockExplanationProvider` is
  original content written to match the same tone, but never actually reviewed by a product
  stakeholder the way the other five were. If asked "has all your merchant-facing copy been
  reviewed," the honest answer is "five of six reasons, yes — the sixth is a self-flagged gap."

## Do not claim the AI explanation feature has observability

- No logging or metrics exist anywhere in `apps/api` — not just for the explanation feature,
  literally none in the whole backend. The two fallback triggers (provider threw vs. output failed
  validation) currently collapse into the same code path with no distinction recorded anywhere.
  This is named directly in `docs/ai-design.md` §5 as "the natural next step... not implemented."
  Don't describe the fallback mechanism as "monitored" or "logged" — it's caught and handled, not
  observed.

## Do not overstate the CSV parser

- `parseCsv` in `packages/shared/src/parsing.ts` has no quoted-field or embedded-comma support.
  The code comment says this directly. It is correct and sufficient for the provided sample data,
  not a general-purpose CSV parser. If asked to defend it against a CSV containing a comma inside
  a quoted field, the honest answer is "it would misparse that row" — not "it handles it."

## Do not claim the drawer tabs follow the full WAI-ARIA "roving tabindex" tabs pattern

- The tabs use `role="tablist"`/`role="tab"`/`role="tabpanel"` with arrow-key navigation (a real
  accessibility enhancement), but every tab button remains individually Tab-reachable rather than
  only the active tab being in the Tab sequence. This is WCAG-compliant (arrow-key support already
  exists as the required enhancement) but is not the canonical roving-tabindex implementation.
  `docs/accessibility.md`'s "Deliberately not done" section names this as a considered, deferred
  choice — deferred specifically because implementing it risked interacting with the focus-trap bug
  that was still being fixed in the same phase, not because it was overlooked.

## Do not claim `inert` is used on background content during the modal

- Considered and explicitly not implemented — the hand-rolled focus trap plus `aria-hidden`
  patterns were judged sufficient for this scope. If asked "why not `inert`," the honest answer is
  "it's a reasonable alternative I considered and didn't prioritize, not something I was unaware
  of" — don't claim it's already there.

## Do not claim export scope was a deliberate, finalized product decision

- The CSV export endpoint exports exceptions only, not matched transactions. This was implemented
  as the simpler, more clearly-scoped option, but the choice between "exceptions-only" and
  "exceptions + matched" was never actually put to a product stakeholder — it's an engineering
  default, flagged as still open in `docs/project-overview.md`, not a resolved requirements
  decision.

## Do not claim there's a data-freshness indicator

- Nothing on the dashboard tells a merchant when the underlying settlement/ledger data was last
  refreshed. This was self-identified during the Phase 1 UX self-review
  (`docs/product-spec.md` §14) as the single most likely support-escalation risk if shipped as-is,
  and it remains unbuilt. If asked "how does a merchant know if they're looking at stale data,"
  the honest answer is "they currently can't tell, and that's the top self-identified gap."
