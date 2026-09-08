import type { NextFunction, Request, Response } from 'express';

import { verifySession } from '../auth/session';

/**
 * The real session/token layer EPIC-15 introduces, replacing the Phase 4 hardcoded mock this
 * middleware used to be (see docs/architecture.md §4, which named this exact swap point before
 * it existed). Every downstream handler still reads only `req.merchantId` -- never a client-
 * supplied value -- so this change is purely about *how* that field gets its value, not about
 * relaxing the non-negotiable itself (CLAUDE.md: "never trust a client-supplied merchant ID").
 */
export interface AuthenticatedRequest extends Request {
  merchantId: string;
}

export const SESSION_COOKIE_NAME = 'rapyd_session';

function readSessionToken(req: Request): string | null {
  const token = (req.cookies as Record<string, unknown> | undefined)?.[SESSION_COOKIE_NAME];
  return typeof token === 'string' ? token : null;
}

/**
 * Requires a valid session; rejects (401) otherwise. Mounted after `/api/auth`, `/api/docs`, and
 * `/api/health` in `app.ts` -- none of those need merchant context, and the auth routes are what
 * establish the session this middleware then requires.
 */
export function attachMerchantContext(req: Request, res: Response, next: NextFunction): void {
  const token = readSessionToken(req);
  const session = token ? verifySession(token) : null;

  if (!session) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Please log in to continue.' },
    });
    return;
  }

  (req as AuthenticatedRequest).merchantId = session.merchantId;
  next();
}
