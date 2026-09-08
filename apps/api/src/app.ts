import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';

import { openApiDocument } from './docs/openapiDocument';
import { requireBasicAuth } from './middleware/basicAuth';
import { errorHandler } from './middleware/errorHandler';
import { attachMerchantContext } from './middleware/merchantContext';
import { authRouter } from './routes/auth';
import { reconciliationRouter } from './routes/reconciliation';

// Documentation-only credentials -- gate the Swagger UI, never the reconciliation endpoints
// themselves (see docs/backlog/ EPIC-14 vs EPIC-15). Override via env vars in any real
// deployment; these defaults exist purely so `npm run dev:api` works out of the box for review.
const SWAGGER_DOCS_USER = process.env.SWAGGER_DOCS_USER ?? 'admin';
const SWAGGER_DOCS_PASSWORD = process.env.SWAGGER_DOCS_PASSWORD ?? 'admin123';

// The session cookie EPIC-15 introduces needs credentials:true (a wildcard CORS origin can't be
// paired with credentialed requests per the fetch spec) and an explicit origin -- the Vite dev
// server by default, overridable for any real deployment where the frontend is served elsewhere.
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: WEB_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(
    '/api/docs',
    requireBasicAuth(SWAGGER_DOCS_USER, SWAGGER_DOCS_PASSWORD),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument),
  );

  // Mounted before attachMerchantContext -- login/logout/session-check are what establish a
  // session, so they can't themselves require one.
  app.use('/api/auth', authRouter);

  app.use(attachMerchantContext);
  app.use('/api/reconciliation', reconciliationRouter);

  // Must be registered last -- Express only routes to an error-handling middleware (4 params)
  // when something earlier calls next(err) or an async handler's rejection is forwarded to it.
  app.use(errorHandler);

  return app;
}
