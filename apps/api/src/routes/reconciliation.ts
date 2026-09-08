import { Router } from 'express';

import {
  exportExceptionsHandler,
  getExceptionByIdHandler,
  getSummaryHandler,
  listExceptionsHandler,
  postExceptionExplanationHandler,
  postSearchExplanationHandler,
  searchExceptionsHandler,
} from '../controllers/reconciliationController';

export const reconciliationRouter = Router();

reconciliationRouter.get('/summary', getSummaryHandler);
// /exceptions/export and /exceptions/search must be registered before /exceptions/:id --
// otherwise Express would match "export"/"search" as the :id param.
reconciliationRouter.get('/exceptions/export', exportExceptionsHandler);
reconciliationRouter.get('/exceptions/search', searchExceptionsHandler);
reconciliationRouter.post('/exceptions/search/explain', postSearchExplanationHandler);
reconciliationRouter.get('/exceptions/:id', getExceptionByIdHandler);
reconciliationRouter.get('/exceptions', listExceptionsHandler);
reconciliationRouter.post('/exceptions/:id/explanation', postExceptionExplanationHandler);
