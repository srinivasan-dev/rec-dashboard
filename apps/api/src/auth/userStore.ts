import bcrypt from 'bcryptjs';

/**
 * A small, take-home-appropriate demo user directory -- not a real user-management system (no
 * signup, no password reset, no multi-merchant support beyond this one row). See
 * docs/backlog/ EPIC-15's scope note: the security floor that still applies regardless of how
 * simple this is -- passwords are never stored in plaintext.
 */
export interface DemoUser {
  username: string;
  passwordHash: string;
  merchantId: string;
}

const DEMO_USERNAME = process.env.DEMO_LOGIN_USERNAME ?? 'm104@rapyd.com';
const DEMO_PASSWORD = process.env.DEMO_LOGIN_PASSWORD ?? 'rapyd@2026';

// Hashed once at process start -- bcrypt.compareSync (verifyPassword, below) is what actually
// runs on every login attempt. The plaintext above exists only transiently in this module's
// startup path, the same way it would for any real user-creation flow.
const users: DemoUser[] = [
  {
    username: DEMO_USERNAME,
    passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    merchantId: 'M-104',
  },
];

export function findUserByUsername(username: string): DemoUser | undefined {
  return users.find((user) => user.username === username);
}

export function verifyPassword(user: DemoUser, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}
