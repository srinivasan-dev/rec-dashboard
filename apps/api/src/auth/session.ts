import jwt from 'jsonwebtoken';

/**
 * The session mechanism EPIC-15 introduces: a signed, stateless JWT carried in an httpOnly
 * cookie (see `SESSION_COOKIE_NAME` in `middleware/merchantContext.ts`). Stateless by design --
 * no server-side session store to add for a take-home -- the signature alone is what makes a
 * client-presented token trustworthy; nothing about `merchantId` is ever read from anywhere the
 * client could directly influence.
 */
export interface SessionPayload {
  merchantId: string;
  username: string;
}

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? 'dev-only-insecure-secret-change-in-production';
const SESSION_TTL = '8h';

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL });
}

/** Returns null for a missing, expired, malformed, or signature-invalid token -- never throws. */
export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
