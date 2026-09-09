/**
 * Hand-authored OpenAPI 3.0 document for every route this API actually registers (see
 * `openapiDocument.test.ts`, which asserts this document's path list matches the Express router's
 * real route table -- so the two can't silently drift apart the way a hand-written doc normally
 * would). Response shapes mirror `serializers/reconciliationSerializers.ts` and
 * `serializers/exceptionsCsv.ts` exactly; error shapes mirror `errorHandler.ts` and each
 * controller's `sendValidationError`/`sendNotFound` helpers.
 */

const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'page: page must be >= 1' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['error'],
} as const;

const exceptionReasonSchema = {
  type: 'string',
  enum: [
    'MISSING_LEDGER',
    'MISSING_SETTLEMENT',
    'DUPLICATE_LEDGER',
    'AMOUNT_MISMATCH',
    'DATE_MISMATCH',
    'CURRENCY_MISMATCH',
  ],
} as const;

const settlementDtoSchema = {
  type: 'object',
  nullable: true,
  properties: {
    settlementId: { type: 'string' },
    transactionDate: { type: 'string', format: 'date', example: '2026-07-08' },
    settlementDate: { type: 'string', format: 'date' },
    currency: { type: 'string', example: 'AED' },
    grossAmount: { type: 'string', example: '267.80' },
    feeAmount: { type: 'string', example: '5.36' },
    netAmount: { type: 'string', example: '262.44' },
    status: { type: 'string' },
  },
} as const;

const ledgerDtoSchema = {
  type: 'object',
  nullable: true,
  properties: {
    ledgerId: { type: 'string' },
    transactionDate: { type: 'string', format: 'date' },
    currency: { type: 'string', example: 'AED' },
    amount: { type: 'string', example: '262.44' },
    status: { type: 'string' },
  },
} as const;

const exceptionDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'T1006' },
    merchantId: { type: 'string', example: 'M-104' },
    transactionId: { type: 'string', example: 'T1006' },
    reason: exceptionReasonSchema,
    currency: { type: 'string', example: 'AED' },
    settlement: settlementDtoSchema,
    ledger: ledgerDtoSchema,
    duplicateLedgerEntries: {
      type: 'array',
      nullable: true,
      items: ledgerDtoSchema,
    },
    differenceAmount: { type: 'string', nullable: true, example: '24.31' },
  },
  required: [
    'id',
    'merchantId',
    'transactionId',
    'reason',
    'currency',
    'settlement',
    'ledger',
    'duplicateLedgerEntries',
    'differenceAmount',
  ],
} as const;

const summaryDtoSchema = {
  type: 'object',
  properties: {
    merchantId: { type: 'string', example: 'M-104' },
    totalChecked: { type: 'integer', example: 14 },
    matchedCount: { type: 'integer', example: 9 },
    exceptionCount: { type: 'integer', example: 5 },
    exceptionsByReason: {
      type: 'object',
      additionalProperties: { type: 'integer' },
      example: {
        MISSING_LEDGER: 1,
        MISSING_SETTLEMENT: 1,
        DUPLICATE_LEDGER: 1,
        AMOUNT_MISMATCH: 1,
        DATE_MISMATCH: 1,
        CURRENCY_MISMATCH: 0,
      },
    },
    financialImpactByCurrency: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          currency: { type: 'string', example: 'AED' },
          amount: { type: 'string', example: '1533.31' },
        },
      },
    },
  },
} as const;

const transactionDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'T1006' },
    merchantId: { type: 'string', example: 'M-104' },
    transactionId: { type: 'string', example: 'T1006' },
    reason: {
      type: 'string',
      enum: [...exceptionReasonSchema.enum, 'MATCHED'],
    },
    currency: { type: 'string', example: 'AED' },
    settlement: settlementDtoSchema,
    ledger: ledgerDtoSchema,
    duplicateLedgerEntries: {
      type: 'array',
      nullable: true,
      items: ledgerDtoSchema,
    },
    differenceAmount: { type: 'string', nullable: true, example: '24.31' },
  },
  required: [
    'id',
    'merchantId',
    'transactionId',
    'reason',
    'currency',
    'settlement',
    'ledger',
    'duplicateLedgerEntries',
    'differenceAmount',
  ],
} as const;

const currencyTotalsDtoSchema = {
  type: 'object',
  properties: {
    currency: { type: 'string', example: 'AED' },
    settlementAmount: { type: 'string', example: '12450.00' },
    ledgerAmount: { type: 'string', example: '12301.35' },
    noImpactExceptionCount: { type: 'integer', example: 1 },
  },
} as const;

const explanationDtoSchema = {
  type: 'object',
  properties: {
    explanationText: { type: 'string' },
    generatedBy: {
      type: 'string',
      example: 'mock',
      description: '"fallback" when the deterministic fallback was used instead of the provider.',
    },
  },
  required: ['explanationText', 'generatedBy'],
} as const;

const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1 },
    pageSize: { type: 'integer', example: 20 },
    total: { type: 'integer', example: 5 },
    totalPages: { type: 'integer', example: 1 },
  },
} as const;

const notFoundResponse = {
  description: 'No exception found for this transaction, scoped to the authenticated merchant.',
  content: { 'application/json': { schema: errorSchema } },
} as const;

const validationErrorResponse = {
  description: 'Query parameters failed validation.',
  content: { 'application/json': { schema: errorSchema } },
} as const;

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Rapyd Settlement Reconciliation API',
    version: '1.0.0',
    description:
      'Merchant-scoped settlement reconciliation endpoints. Every request is scoped to the ' +
      'authenticated merchant via server-side middleware (never a client-supplied merchant ID) ' +
      '-- see docs/architecture.md §4. This documentation UI is separately gated by HTTP Basic ' +
      'Auth (EPIC-14); it does not grant access to the reconciliation endpoints themselves.',
  },
  servers: [{ url: '/api/reconciliation' }],
  tags: [{ name: 'Reconciliation' }],
  paths: {
    '/summary': {
      get: {
        tags: ['Reconciliation'],
        summary: "Get the authenticated merchant's reconciliation summary",
        description: 'Counts and per-currency financial impact, grouped by exception reason.',
        parameters: [
          {
            name: 'from',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'ISO date, inclusive -- restricts the summary to this date range.',
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'ISO date, inclusive.',
          },
        ],
        responses: {
          '200': {
            description: 'Summary for the authenticated merchant.',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: summaryDtoSchema } },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },
    '/summary/currency-totals': {
      get: {
        tags: ['Reconciliation'],
        summary: "Get the authenticated merchant's settlement/ledger totals per currency",
        description:
          'Settlement-side vs. ledger-side totals per currency, across every checked ' +
          'transaction (matched and exceptions alike) -- not just the exceptions’ financial ' +
          'impact (see GET /summary). Backs the dashboard’s financial-impact-by-currency ' +
          'widget. Accepts the same `from`/`to` date-range filter as GET /summary.',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Per-currency totals for the authenticated merchant.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { type: 'array', items: currencyTotalsDtoSchema } },
                },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },
    '/exceptions': {
      get: {
        tags: ['Reconciliation'],
        summary: "List the authenticated merchant's exceptions (paginated, filterable, sortable)",
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          { name: 'reason', in: 'query', schema: exceptionReasonSchema },
          {
            name: 'from',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'ISO date, inclusive.',
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'ISO date, inclusive.',
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['transactionDate', 'transactionId', 'reason', 'differenceAmount'],
              default: 'transactionDate',
            },
          },
          {
            name: 'sortOrder',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          },
        ],
        responses: {
          '200': {
            description: "A page of the authenticated merchant's exceptions.",
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: exceptionDtoSchema },
                    pagination: paginationSchema,
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },
    '/exceptions/export': {
      get: {
        tags: ['Reconciliation'],
        summary: "Export the authenticated merchant's exceptions as CSV",
        description:
          'Accepts the same filters as GET /exceptions (reason, from, to); no pagination -- exports every matching row.',
        parameters: [
          { name: 'reason', in: 'query', schema: exceptionReasonSchema },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'CSV file download.',
            content: { 'text/csv': { schema: { type: 'string' } } },
          },
          '400': validationErrorResponse,
        },
      },
    },
    '/exceptions/search': {
      get: {
        tags: ['Reconciliation'],
        summary: "Search the authenticated merchant's exceptions",
        description:
          'Matches transaction ID, reason code, currency, or any settlement/ledger/difference ' +
          'amount, case-insensitively, across the merchant’s full exception set (ignores ' +
          'pagination/filters). Capped at 50 results, sorted by transaction date. If nothing ' +
          'matches literally, falls back to returning the merchant’s entire exception set with ' +
          '`matchType: "intent"` (the same candidate pool POST /exceptions/search/explain hands ' +
          'to the AI summary for a vague/natural-language query) as long as the query still ' +
          'plausibly relates to reconciliation; if it has no such connection at all (e.g. "what ' +
          'is the capital of Japan"), returns an empty result with `matchType: "off-topic"` ' +
          'instead; if it matches a mocked FAQ entry (e.g. a refund-timing question), returns an ' +
          'empty result with `matchType: "knowledge-base"`.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 1, maxLength: 200 },
          },
        ],
        responses: {
          '200': {
            description:
              'Matching exceptions for the authenticated merchant, or -- if none ' +
              'matched literally -- the full exception set (see matchType).',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: exceptionDtoSchema },
                    matchType: {
                      type: 'string',
                      enum: ['literal', 'intent', 'off-topic', 'knowledge-base'],
                    },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },
    '/exceptions/search/explain': {
      post: {
        tags: ['Reconciliation'],
        summary: "Get an AI-generated summary of the authenticated merchant's search results",
        description:
          'Re-runs the search server-side (same matching as GET /exceptions/search) and asks a ' +
          'provider (Claude, by default) to summarize the matches in merchant-friendly language -- ' +
          'grounded only in deterministic facts (counts, financial impact, a bounded sample of ' +
          'matching transactions) computed from that result set. Falls back to a deterministic, ' +
          'template-based summary if the provider is unavailable or its output looks unusable; ' +
          'never errors on provider failure.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { q: { type: 'string', minLength: 1, maxLength: 200 } },
                required: ['q'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'A summary of the matches (or "no exceptions matched" if there are none).',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        explanationText: { type: 'string' },
                        generatedBy: {
                          type: 'string',
                          example: 'claude',
                          description:
                            '"fallback" when the deterministic fallback was used instead of the provider.',
                        },
                        matchCount: { type: 'integer', example: 3 },
                      },
                      required: ['explanationText', 'generatedBy', 'matchCount'],
                    },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },
    '/exceptions/{id}': {
      get: {
        tags: ['Reconciliation'],
        summary: 'Get one exception by transaction ID, scoped to the authenticated merchant',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'T1006' },
        ],
        responses: {
          '200': {
            description: 'The exception, if it belongs to the authenticated merchant.',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: exceptionDtoSchema } },
              },
            },
          },
          '404': notFoundResponse,
        },
      },
    },
    '/transactions': {
      get: {
        tags: ['Reconciliation'],
        summary:
          'List every checked transaction for the authenticated merchant -- matched and exceptions alike',
        description:
          'Same shape, filters, and pagination as GET /exceptions, widened to also include ' +
          'matched transactions (`reason: "MATCHED"`) -- backs the dashboard’s "show matched ' +
          'transactions" toggle (Toolbar.tsx). Exceptions-only views should keep using GET ' +
          '/exceptions instead.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          { name: 'reason', in: 'query', schema: exceptionReasonSchema },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['transactionDate', 'transactionId', 'reason', 'differenceAmount'],
              default: 'transactionDate',
            },
          },
          {
            name: 'sortOrder',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          },
        ],
        responses: {
          '200': {
            description: "A page of the authenticated merchant's transactions.",
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: transactionDtoSchema },
                    pagination: paginationSchema,
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },
    '/transactions/{id}': {
      get: {
        tags: ['Reconciliation'],
        summary:
          'Get one transaction (matched or exception) by transaction ID, scoped to the authenticated merchant',
        description:
          'Same lookup as GET /exceptions/{id}, widened to also resolve a matched transaction -- ' +
          'backs the inline exception-detail panel, which can expand either kind of row.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'T1006' },
        ],
        responses: {
          '200': {
            description: 'The transaction, if it belongs to the authenticated merchant.',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: transactionDtoSchema } },
              },
            },
          },
          '404': notFoundResponse,
        },
      },
    },
    '/exceptions/{id}/explanation': {
      post: {
        tags: ['Reconciliation'],
        summary: 'Get a plain-English explanation of why an exception was flagged',
        description:
          "Generated from the exception's already-decided facts (see docs/ai-design.md). Never " +
          'errors on provider failure -- a deterministic fallback is returned instead, tagged ' +
          '`generatedBy: "fallback"`.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'T1006' },
        ],
        responses: {
          '200': {
            description: 'An explanation -- from the provider, or the deterministic fallback.',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: explanationDtoSchema } },
              },
            },
          },
          '404': notFoundResponse,
        },
      },
    },
  },
} as const;
