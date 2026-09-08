import { Router } from 'express';

import {
  exportExceptionsHandler,
  getCurrencyTotalsHandler,
  getExceptionByIdHandler,
  getSummaryHandler,
  getTransactionByIdHandler,
  listExceptionsHandler,
  listTransactionsHandler,
  postExceptionExplanationHandler,
  postSearchExplanationHandler,
  searchExceptionsHandler,
} from '../controllers/reconciliationController';

export const reconciliationRouter = Router();

reconciliationRouter.get('/summary', getSummaryHandler);
reconciliationRouter.get('/summary/currency-totals', getCurrencyTotalsHandler);
// /exceptions/export and /exceptions/search must be registered before /exceptions/:id --
// otherwise Express would match "export"/"search" as the :id param.
reconciliationRouter.get('/exceptions/export', exportExceptionsHandler);
reconciliationRouter.get('/exceptions/search', searchExceptionsHandler);
reconciliationRouter.post('/exceptions/search/explain', postSearchExplanationHandler);
reconciliationRouter.get('/exceptions/:id', getExceptionByIdHandler);
reconciliationRouter.get('/exceptions', listExceptionsHandler);
reconciliationRouter.post('/exceptions/:id/explanation', postExceptionExplanationHandler);
// Every checked transaction (matched + exceptions) -- Toolbar.tsx's "show matched transactions"
// checkbox. Same :id-before-list registration-order caveat as /exceptions above.
reconciliationRouter.get('/transactions/:id', getTransactionByIdHandler);
reconciliationRouter.get('/transactions', listTransactionsHandler);
