import type { Request, Response } from 'express';
import { generateMfaQrCode, generateMfaSecret, verifyMfaToken } from '../lib/mfa.js';
import { User } from '../models/User.js';

type MfaRequest = Request & {
  authUser?: {
    id: string;
  };
};

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

    if (user.mfaEnabled) {
      response.status(400).json({ error: 'Disable MFA before setting up a new authenticator app' });
      return;
    }

    const { base32, otpauthUrl } = generateMfaSecret(user.email);
    const qrCodeDataUrl = await generateMfaQrCode(otpauthUrl);

    user.mfaSecret = base32;
    user.mfaEnabled = false;
    await user.save();

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

    const user = await User.findById(userId);
    if (!user || !user.mfaSecret) {
      response.status(404).json({ error: 'MFA setup not found' });
      return;
    }

    if (!verifyMfaToken(user.mfaSecret, token)) {
      response.status(400).json({ error: 'Invalid MFA token' });
      return;
    }

    user.mfaEnabled = true;
    await user.save();

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

    const user = await User.findById(userId);
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

    const user = await User.findById(userId);
    if (!user || !user.mfaSecret || !user.mfaEnabled) {
      response.status(400).json({ error: 'MFA is not enabled' });
      return;
    }

    if (!verifyMfaToken(user.mfaSecret, token)) {
      response.status(400).json({ error: 'Invalid MFA token' });
      return;
    }

    user.mfaSecret = undefined;
    user.mfaEnabled = false;
    await user.save();

    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}
