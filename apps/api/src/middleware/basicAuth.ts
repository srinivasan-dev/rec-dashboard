import { timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

const REALM = 'Rapyd API Docs';

/**
 * Constant-time string comparison -- `===` short-circuits on the first differing byte, which
 * leaks how many leading characters of a guess were correct via response timing. Not a realistic
 * risk for a take-home, but the fix costs nothing and this is exactly the kind of shortcut that's
 * easy to forget to revisit later, so it's done right from the start.
 */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function parseBasicAuthHeader(
  header: string | undefined,
): { username: string; password: string } | null {
  if (!header?.startsWith('Basic ')) return null;

  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf-8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

/**
 * Gates a route behind HTTP Basic Auth. Scoped deliberately narrow -- this exists to keep the
 * Swagger UI (EPIC-14) from being publicly browsable, not to protect merchant data. Basic Auth is
 * a weak mechanism (credentials resent on every request, no session, no expiry) and is never used
 * to gate `/api/reconciliation/*`; that boundary is the real session-based login (EPIC-15,
 * `attachMerchantContext`).
 */
export function requireBasicAuth(username: string, password: string): RequestHandler {
  return function basicAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    const credentials = parseBasicAuthHeader(req.headers.authorization);

    if (
      credentials &&
      safeEqual(credentials.username, username) &&
      safeEqual(credentials.password, password)
    ) {
      next();
      return;
    }

    res.setHeader('WWW-Authenticate', `Basic realm="${REALM}"`);
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Basic authentication required to view API documentation.',
      },
    });
  };
}
