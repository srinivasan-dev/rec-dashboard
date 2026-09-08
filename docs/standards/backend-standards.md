# Backend Standards — Node.js / TypeScript / Express

Applies to `apps/api` and `packages/shared`. Read `docs/architecture.md` first for _why_ the
layers are split this way — this doc is the _how_ for day-to-day code.

## Layering — controllers stay thin

```text
route → controller → service → (reconciliation engine | repository) → response
```

- **Controllers** parse/validate the request (Zod) and shape the response. No business logic,
  no direct CSV/data access, no reconciliation rules. A controller should read like a summary of
  what happens, not contain the logic itself.
- **Services** own business logic: calling the reconciliation engine, applying
  filter/sort/pagination, enforcing merchant scoping on every query.
- **The reconciliation engine** (`packages/shared`) is pure, synchronous, and has zero
  Express dependency — see `docs/architecture.md` §3. It never reads `req`/`res`.

If you find yourself writing an `if` about reconciliation rules inside a route handler, that
logic belongs in `packages/shared` instead.

## Merchant isolation

- The authenticated merchant is resolved once, by `attachMerchantContext` middleware, into
  `req.merchantId`. Every service call takes `merchantId` as an explicit parameter.
- **Never** accept a merchant ID from `req.query`, `req.body`, or `req.params` and use it to
  scope a query. If a route needs a merchant ID from the URL (e.g. an admin tool later), it must
  be checked against `req.merchantId`, not used to override it.
- A request for another merchant's resource by ID returns `404`, not `403` — don't confirm to a
  caller that a resource exists for a merchant they can't access.

## Validation

- All request input (query params, body) is validated with **Zod** at the controller boundary,
  before it reaches a service. Invalid input → `400` with a specific, actionable message (which
  field, why) — never a generic "bad request."
- Derive TypeScript types from Zod schemas (`z.infer<typeof schema>`) rather than maintaining
  parallel interfaces that can drift from the runtime validation.

## Error handling

- Three response shapes: `400` (validation), `404` (not found / not accessible to this
  merchant), `500` (unexpected). No other status codes unless a specific need arises.
- Never leak internals in an error response: no stack traces, file paths, SQL, or raw exception
  messages to the client. Log those server-side; return a stable, generic message to the caller.
- The reconciliation engine doesn't throw for "the data has a problem" (that's a
  `ReconciliationException` — an expected outcome). It only throws for genuine programmer
  errors (malformed input shape it should never receive from validated data).

## Monetary precision

- Parse decimal-string amounts from CSVs into **integer minor units** exactly once, at the
  repository/parsing boundary. Never store or compare money as a JS `number` in decimal form.
- All arithmetic (differences, sums-by-currency) happens in the integer domain. Convert back to
  a display string only at the response edge.
- Never sum amounts across currencies. A summary grouped by currency is correct; a single total
  across AED + USD + EUR is a bug, not a rounding edge case.

## Testing

- **Unit tests** (Jest) for the reconciliation engine in `packages/shared` — this is the
  highest-value test suite in the repo. Cover every exception rule, precedence when multiple
  problems overlap, merchant isolation at the data layer, and money precision (no float drift).
- **Integration tests** (Jest + Supertest) for `apps/api` routes — status codes, pagination/
  filter behavior, merchant isolation at the HTTP layer, validation error shapes.
- Test behavior and contracts, not implementation. A test should still pass if you refactor the
  internals without changing what the endpoint promises.
- Run `npm run test:api` before pushing; the pre-commit hook runs lint + typecheck on every
  commit but does not run the full suite (kept fast on purpose — see `docs/standards/*` "Before
  you commit" note in `CLAUDE.md`).

## Naming & style

- Files: `camelCase.ts` for modules, `PascalCase.ts` only for a file whose default export is a
  class. Types/interfaces: `PascalCase`. Constants: `SCREAMING_SNAKE_CASE` only for true
  compile-time constants (e.g. `MOCK_AUTHENTICATED_MERCHANT_ID`), otherwise `camelCase`.
- Prefer explicit return types on exported functions — it documents the contract and catches
  accidental type-widening at the call site, not three files downstream.
- No `any`. If a type is genuinely unknown at a boundary (e.g. parsing untyped CSV rows), use
  `unknown` and narrow it explicitly.

## Security basics

- `cors` configured, not wide open by accident once a real frontend origin is known.
- No secrets committed — `.env` is gitignored; `.env.example` documents required vars without
  values.
- Dependencies: run `npm audit` periodically; don't silently ignore high/critical findings.
