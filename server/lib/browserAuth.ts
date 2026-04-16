import type { Response } from 'express';
import { createSession, updateSessionRefreshToken } from './store.js';
import { setAuthCookies } from './cookies.js';
import { createOpaqueToken, hashToken, signJwt } from './tokens.js';
import { getRequiredEnv } from './env.js';

const accessTokenLifetimeSeconds = 60 * 15;
const refreshTokenLifetimeSeconds = 60 * 60 * 24 * 14;

function getFrontendUrl() {
  return process.env.FRONTEND_URL ?? 'http://localhost:5173';
}

function useSecureCookies() {
  const cookieSecure = process.env.COOKIE_SECURE?.trim().toLowerCase();

  if (cookieSecure === 'true') {
    return true;
  }

  if (cookieSecure === 'false') {
    return false;
  }

  return new URL(getFrontendUrl()).protocol === 'https:';
}

function createAccessToken(userId: string, sessionId: string) {
  return signJwt(
    { mfaVerified: true, sid: sessionId, sub: userId, type: 'access' },
    getRequiredEnv('JWT_ACCESS_SECRET'),
    accessTokenLifetimeSeconds
  );
}

function createRefreshToken(userId: string, sessionId: string) {
  return `${createOpaqueToken()}.${signJwt(
    { sid: sessionId, sub: userId, type: 'refresh' },
    getRequiredEnv('JWT_REFRESH_SECRET'),
    refreshTokenLifetimeSeconds
  )}`;
}

export async function createAuthenticatedBrowserSession(response: Response, userId: string) {
  const session = await createSession({
    expiresAt: new Date(Date.now() + refreshTokenLifetimeSeconds * 1000).toISOString(),
    mfaVerified: true,
    refreshTokenHash: 'pending',
    userId,
  });
  const accessToken = createAccessToken(userId, session.id);
  const refreshToken = createRefreshToken(userId, session.id);
  const refreshTokenHash = hashToken(refreshToken, getRequiredEnv('JWT_REFRESH_SECRET'));
  const refreshExpiresAt = new Date(Date.now() + refreshTokenLifetimeSeconds * 1000).toISOString();

  await updateSessionRefreshToken(session.id, refreshTokenHash, refreshExpiresAt, true);
  setAuthCookies(response, {
    accessToken,
    accessTokenMaxAgeSeconds: accessTokenLifetimeSeconds,
    refreshToken,
    refreshTokenMaxAgeSeconds: refreshTokenLifetimeSeconds,
    secureCookies: useSecureCookies(),
  });

  return {
    accessToken,
    sessionId: session.id,
  };
}

export async function rotateAuthenticatedBrowserSession(
  response: Response,
  input: {
    mfaVerified: boolean;
    sessionId: string;
    userId: string;
  }
) {
  const accessToken = signJwt(
    {
      mfaVerified: input.mfaVerified,
      sid: input.sessionId,
      sub: input.userId,
      type: 'access',
    },
    getRequiredEnv('JWT_ACCESS_SECRET'),
    accessTokenLifetimeSeconds
  );
  const refreshToken = createRefreshToken(input.userId, input.sessionId);
  const refreshTokenHash = hashToken(refreshToken, getRequiredEnv('JWT_REFRESH_SECRET'));
  const refreshExpiresAt = new Date(Date.now() + refreshTokenLifetimeSeconds * 1000).toISOString();

  await updateSessionRefreshToken(
    input.sessionId,
    refreshTokenHash,
    refreshExpiresAt,
    input.mfaVerified
  );
  setAuthCookies(response, {
    accessToken,
    accessTokenMaxAgeSeconds: accessTokenLifetimeSeconds,
    refreshToken,
    refreshTokenMaxAgeSeconds: refreshTokenLifetimeSeconds,
    secureCookies: useSecureCookies(),
  });
}
