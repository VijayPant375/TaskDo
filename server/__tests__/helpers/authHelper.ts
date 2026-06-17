import jwt from 'jsonwebtoken';

export const TEST_USER_ID = 'test-user-123';
export const TEST_USER_EMAIL = 'test@example.com';

export function makeAccessToken(userId = TEST_USER_ID): string {
  return jwt.sign(
    { sub: userId, type: 'access', mfaVerified: true },
    process.env.JWT_ACCESS_SECRET ?? 'test-secret',
    { expiresIn: '1h' }
  );
}

export function authCookieHeader(userId = TEST_USER_ID): string {
  // 'taskdo_access_token' is the value of accessCookieName in lib/cookies.ts
  return `taskdo_access_token=${makeAccessToken(userId)}`;
}
