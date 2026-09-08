import type { Request, Response } from 'express';
import type { ZodError } from 'zod';

import type { AuthenticatedRequest } from '../middleware/merchantContext';
import { toExceptionsCsv } from '../serializers/exceptionsCsv';
import { toExceptionsPdf } from '../serializers/exceptionsPdf';
import { toExceptionsXlsx } from '../serializers/exceptionsXlsx';
import { toExceptionDto, toSummaryDto } from '../serializers/reconciliationSerializers';
import { getExplanation } from '../services/explanationService';
import {
  getExceptionById,
  getSummary,
  listExceptions,
  listExceptionsForExport,
  searchExceptionsOrAll,
} from '../services/reconciliationService';
import { getSearchExplanation } from '../services/searchExplanationService';
import { asyncHandler } from '../utils/asyncHandler';
import {
  exceptionsExportQuerySchema,
  exceptionsListQuerySchema,
  exceptionsSearchExplainBodySchema,
  exceptionsSearchQuerySchema,
} from '../validation/exceptionsQuery';

// req.merchantId is set by attachMerchantContext for every request that reaches these
// controllers (see docs/architecture.md §4) -- never read a merchant id from req.query/body/params.
function merchantIdOf(req: Request): string {
  return (req as AuthenticatedRequest).merchantId;
}

function sendValidationError(res: Response, error: ZodError): void {
  const [firstIssue] = error.issues;
  res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: firstIssue
        ? `${firstIssue.path.join('.') || 'query'}: ${firstIssue.message}`
        : 'Invalid query parameters.',
    },
  });
}

function sendNotFound(res: Response): void {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: 'No exception found for this transaction.' } });
}

export const getSummaryHandler = asyncHandler(async (req, res) => {
  res.status(200).json({ data: toSummaryDto(getSummary(merchantIdOf(req))) });
});

export const listExceptionsHandler = asyncHandler(async (req, res) => {
  const parsed = exceptionsListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const result = listExceptions(merchantIdOf(req), parsed.data);
  res.status(200).json({ data: result.data.map(toExceptionDto), pagination: result.pagination });
});

export const getExceptionByIdHandler = asyncHandler(async (req, res) => {
  const exception = getExceptionById(merchantIdOf(req), req.params.id!);
  if (!exception) {
    sendNotFound(res);
    return;
  }
  res.status(200).json({ data: toExceptionDto(exception) });
});

export const exportExceptionsHandler = asyncHandler(async (req, res) => {
  const parsed = exceptionsExportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const merchantId = merchantIdOf(req);
  const exceptions = listExceptionsForExport(merchantId, parsed.data);

  switch (parsed.data.format) {
    case 'xlsx': {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="exceptions.xlsx"');
      res.status(200).send(await toExceptionsXlsx(exceptions, merchantId));
      return;
    }
    case 'pdf': {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="exceptions.pdf"');
      res.status(200).send(await toExceptionsPdf(exceptions, merchantId));
      return;
    }
    case 'csv':
    default: {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="exceptions.csv"');
      res.status(200).send(toExceptionsCsv(exceptions));
      return;
    }
  }
});

export const searchExceptionsHandler = asyncHandler(async (req, res) => {
  const parsed = exceptionsSearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const result = searchExceptionsOrAll(merchantIdOf(req), parsed.data.q);
  res.status(200).json({ data: result.data.map(toExceptionDto), matchType: result.matchType });
});

export const postExceptionExplanationHandler = asyncHandler(async (req, res) => {
  const exception = getExceptionById(merchantIdOf(req), req.params.id!);
  if (!exception) {
    sendNotFound(res);
    return;
  }
  res.status(200).json({ data: await getExplanation(exception) });
});

export const postSearchExplanationHandler = asyncHandler(async (req, res) => {
  const parsed = exceptionsSearchExplainBodySchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  // Re-runs the search server-side rather than trusting a client-supplied match list -- the
  // explanation must be grounded in the exact same result set GET /exceptions/search would hand
  // the table for this query (searchExceptionsOrAll is the one place that decides literal vs.
  // "no literal match -> fall back to the full account" -- see its docstring), so the table and
  // this summary can never disagree about what a query matched.
  const merchantId = merchantIdOf(req);
  const result = searchExceptionsOrAll(merchantId, parsed.data.q);

  const explanation = await getSearchExplanation(parsed.data.q, result.data, {
    mode: result.matchType,
    literalMatchCount: result.matchType === 'literal' ? result.data.length : 0,
  });
  res.status(200).json({ data: explanation });
});
