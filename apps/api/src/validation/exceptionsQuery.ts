import { z } from 'zod';

export const EXCEPTION_REASONS = [
  'MISSING_LEDGER',
  'MISSING_SETTLEMENT',
  'DUPLICATE_LEDGER',
  'AMOUNT_MISMATCH',
  'DATE_MISMATCH',
  'CURRENCY_MISMATCH',
] as const;

const isoDateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)');

function dateRangeIsValid(query: { from?: string; to?: string }): boolean {
  return !query.from || !query.to || query.from <= query.to;
}

const DATE_RANGE_ISSUE = { message: '"from" must not be after "to"', path: ['from'] };

const transactionIdParam = z
  .string()
  .trim()
  .min(1)
  .max(100, 'transactionId must be at most 100 characters');

export const exceptionsListQuerySchema = z
  .object({
    page: z.coerce.number().int('page must be an integer').min(1, 'page must be >= 1').default(1),
    pageSize: z.coerce
      .number()
      .int('pageSize must be an integer')
      .min(1, 'pageSize must be >= 1')
      .max(100, 'pageSize must be <= 100')
      .default(10),
    reason: z.enum(EXCEPTION_REASONS).optional(),
    from: isoDateParam.optional(),
    to: isoDateParam.optional(),
    // Quick transaction-id filter (Toolbar.tsx's TransactionIdSearchBox) -- a case-insensitive
    // substring match, not the exact-id lookup GET /exceptions/:id does; distinct from the global
    // search bar (searchExceptions), which also matches reason/currency/amounts, not just the id.
    transactionId: transactionIdParam.optional(),
    sortBy: z
      .enum(['transactionDate', 'transactionId', 'reason', 'differenceAmount'])
      .default('transactionDate'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .refine(dateRangeIsValid, DATE_RANGE_ISSUE);

export type ExceptionsListQuery = z.infer<typeof exceptionsListQuerySchema>;

/** Just the date-range half of `exceptionsListQuerySchema`, reused by the summary/currency-totals
 *  endpoints -- the date range picker that drives the table (Toolbar.tsx, historically) now also
 *  drives the dashboard's chart widgets, so both need to accept and validate the same from/to
 *  shape. */
export const dateRangeQuerySchema = z
  .object({
    from: isoDateParam.optional(),
    to: isoDateParam.optional(),
  })
  .refine(dateRangeIsValid, DATE_RANGE_ISSUE);

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const exceptionsExportQuerySchema = z
  .object({
    reason: z.enum(EXCEPTION_REASONS).optional(),
    from: isoDateParam.optional(),
    to: isoDateParam.optional(),
    transactionId: transactionIdParam.optional(),
    format: z.enum(EXPORT_FORMATS).default('csv'),
    // Exported rows follow the same sort as the on-screen table (whatever the merchant last set),
    // not a fixed order -- an export of "the current view" should match what they were looking at.
    sortBy: z
      .enum(['transactionDate', 'transactionId', 'reason', 'differenceAmount'])
      .default('transactionDate'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .refine(dateRangeIsValid, DATE_RANGE_ISSUE);

export type ExceptionsExportQuery = z.infer<typeof exceptionsExportQuerySchema>;

export const MAX_SEARCH_RESULTS = 50;

export const exceptionsSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'q must not be empty').max(200, 'q must be at most 200 characters'),
});

export type ExceptionsSearchQuery = z.infer<typeof exceptionsSearchQuerySchema>;

export const exceptionsSearchExplainBodySchema = z.object({
  q: z.string().trim().min(1, 'q must not be empty').max(200, 'q must be at most 200 characters'),
});

export type ExceptionsSearchExplainBody = z.infer<typeof exceptionsSearchExplainBodySchema>;
