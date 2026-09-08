import type { Response } from 'express';
import { z } from 'zod';

import { signSession, verifySession } from '../auth/session';
import { findUserByUsername, verifyPassword } from '../auth/userStore';
import { SESSION_COOKIE_NAME } from '../middleware/merchantContext';
import { asyncHandler } from '../utils/asyncHandler';

const loginSchema = z.object({
  username: z.string().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
});

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // matches session.ts's 8h JWT expiry

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Only requires HTTPS once actually deployed over HTTPS -- `secure: true` on plain HTTP
    // localhost would silently drop the cookie and break local dev.
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

export const loginHandler = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'username and password are required.' },
    });
    return;
  }

  const user = findUserByUsername(parsed.data.username);
  // Deliberately the same response whether the username doesn't exist or the password is wrong
  // -- distinguishing the two would let an attacker enumerate valid usernames.
  if (!user || !verifyPassword(user, parsed.data.password)) {
    res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' },
    });
    return;
  }

  const token = signSession({ merchantId: user.merchantId, username: user.username });
  setSessionCookie(res, token);
  res.status(200).json({ data: { merchantId: user.merchantId } });
});

export const logoutHandler = asyncHandler(async (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.status(200).json({ data: { loggedOut: true } });
});

/**
 * Lets the frontend check "am I logged in" on load without forcing a hard redirect loop through
 * the reconciliation endpoints themselves -- a dedicated, side-effect-free check.
 */
export const sessionHandler = asyncHandler(async (req, res) => {
  const token = (req.cookies as Record<string, unknown> | undefined)?.[SESSION_COOKIE_NAME];
  const session = typeof token === 'string' ? verifySession(token) : null;

  if (!session) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Not logged in.' } });
    return;
  }

  res.status(200).json({ data: { merchantId: session.merchantId } });
});
