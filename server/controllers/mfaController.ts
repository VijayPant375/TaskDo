import type { Request, Response } from 'express';
import { generateMfaQrCode, generateMfaSecret, verifyMfaToken } from '../lib/mfa.js';
import { accessCookieName, parseCookies, refreshCookieName } from '../lib/cookies.js';
import { getRequiredEnv } from '../lib/env.js';
import { verifyJwt } from '../lib/tokens.js';
import { getSessionById, updateSessionMfaState } from '../lib/store.js';
import { User } from '../models/User.js';

type MfaRequest = Request & {
  authUser?: {
    id: string;
  };
};

async function getAuthenticatedSession(request: Request) {
  const cookies = parseCookies(request.headers.cookie);
  const accessToken = cookies[accessCookieName];

  if (accessToken) {
    const accessPayload = verifyJwt(accessToken, getRequiredEnv('JWT_ACCESS_SECRET'));
    if (accessPayload?.type === 'access' && typeof accessPayload.sid === 'string') {
      return getSessionById(accessPayload.sid);
    }
  }

  const refreshToken = cookies[refreshCookieName];
  if (!refreshToken) {
    return null;
  }

  const parts = refreshToken.split('.');
  if (parts.length < 4) {
    return null;
  }

  const refreshPayload = verifyJwt(
    parts.slice(1).join('.'),
    getRequiredEnv('JWT_REFRESH_SECRET')
  );
  if (refreshPayload?.type !== 'refresh' || typeof refreshPayload.sid !== 'string') {
    return null;
  }

  return getSessionById(refreshPayload.sid);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function getAuthenticatedUserId(request: MfaRequest) {
  return typeof request.authUser?.id === 'string' ? request.authUser.id : null;
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, '').trim() : '';
}

export async function generateMFASetup(request: MfaRequest, response: Response) {
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      response.status(404).json({ error: 'User not found' });
      return;
    }

    const session = await getAuthenticatedSession(request);
    if (!session || session.userId !== userId) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (user.mfaEnabled) {
      response.status(400).json({ error: 'Disable MFA before setting up a new authenticator app' });
      return;
    }

    const { base32, otpauthUrl } = generateMfaSecret(user.email);
    const qrCodeDataUrl = await generateMfaQrCode(otpauthUrl);

    await updateSessionMfaState(session.id, {
      tempMfaSecret: base32,
    });

    response.json({
      qrCodeDataUrl,
      secret: base32,
    });
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function enableMFA(request: MfaRequest, response: Response) {
  try {
    const userId = getAuthenticatedUserId(request);
    const token = normalizeToken(request.body.token);

    if (!userId) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!token) {
      response.status(400).json({ error: 'MFA token is required' });
      return;
    }

    const session = await getAuthenticatedSession(request);
    if (!session || session.userId !== userId || !session.tempMfaSecret) {
      response.status(404).json({ error: 'MFA setup not found' });
      return;
    }

    if (!verifyMfaToken(session.tempMfaSecret, token)) {
      response.status(400).json({ error: 'Invalid MFA token' });
      return;
    }

    const user = await User.findById(userId).select('+mfaSecret');
    if (!user) {
      response.status(404).json({ error: 'User not found' });
      return;
    }

    user.mfaSecret = session.tempMfaSecret;
    user.mfaEnabled = true;
    await user.save();
    await updateSessionMfaState(session.id, {
      tempMfaSecret: null,
    });

    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function verifyMFA(request: MfaRequest, response: Response) {
  try {
    const userId = getAuthenticatedUserId(request);
    const token = normalizeToken(request.body.token);

    if (!userId) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!token) {
      response.status(400).json({ error: 'MFA token is required' });
      return;
    }

    const user = await User.findById(userId).select('+mfaSecret');
    if (!user || !user.mfaSecret || !user.mfaEnabled) {
      response.status(400).json({ error: 'MFA is not enabled' });
      return;
    }

    if (!verifyMfaToken(user.mfaSecret, token)) {
      response.status(400).json({ error: 'Invalid MFA token' });
      return;
    }

    response.json({ verified: true });
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function disableMFA(request: MfaRequest, response: Response) {
  try {
    const userId = getAuthenticatedUserId(request);
    const token = normalizeToken(request.body.token);

    if (!userId) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!token) {
      response.status(400).json({ error: 'MFA token is required' });
      return;
    }

    const user = await User.findById(userId).select('+mfaSecret');
    if (!user || !user.mfaSecret || !user.mfaEnabled) {
      response.status(400).json({ error: 'MFA is not enabled' });
      return;
    }

    if (!verifyMfaToken(user.mfaSecret, token)) {
      response.status(400).json({ error: 'Invalid MFA token' });
      return;
    }

    user.mfaSecret = null;
    user.mfaEnabled = false;
    await user.save();

    const session = await getAuthenticatedSession(request);
    if (session && session.userId === userId) {
      await updateSessionMfaState(session.id, {
        mfaVerified: false,
        tempMfaSecret: null,
      });
    }

    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}
