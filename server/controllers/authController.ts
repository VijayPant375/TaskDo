import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { upsertLocalUser } from '../lib/store.js';
import { verifyMfaToken } from '../lib/mfa.js';
import { User } from '../models/User.js';
import { getRequiredEnv } from '../lib/env.js';
import { createAuthenticatedBrowserSession } from '../lib/browserAuth.js';

function getJwtSecret() {
  return getRequiredEnv('JWT_ACCESS_SECRET');
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function createAuthToken(userId: string) {
  return jwt.sign({ id: userId }, getJwtSecret());
}

export function createMfaChallengeToken(userId: string) {
  return jwt.sign({ purpose: 'mfa-login', sub: userId }, getJwtSecret(), {
    expiresIn: '10m',
  });
}

function verifyMfaChallengeToken(token: string) {
  let payload: { purpose?: string; sub?: string };

  try {
    payload = jwt.verify(token, getJwtSecret()) as { purpose?: string; sub?: string };
  } catch {
    throw new Error('Invalid MFA challenge token');
  }

  if (payload.purpose !== 'mfa-login' || typeof payload.sub !== 'string') {
    throw new Error('Invalid MFA challenge token');
  }

  return payload.sub;
}

function serializeAuthResponse(user: {
  email: string;
  username?: string;
  mfaEnabled?: boolean;
  _id: { toString(): string };
}) {
  const authUser = upsertLocalUser({
    email: user.email,
    id: user._id.toString(),
    name: user.username || user.email.split('@')[0],
  });

  const token = createAuthToken(authUser.id);

  return {
    token,
    user: {
      email: user.email,
      id: authUser.id,
      mfaEnabled: Boolean(user.mfaEnabled),
      username: user.username || user.email.split('@')[0],
    },
  };
}

export async function signup(request: Request, response: Response) {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';
    const username = typeof request.body.username === 'string' ? request.body.username.trim() : '';

    if (!email || !password || !username) {
      response.status(400).json({ error: 'Email, password, and username are required' });
      return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      response.status(400).json({ error: 'User already exists' });
      return;
    }

    const existingUsername = await User.exists({ username: { $regex: new RegExp(`^${username}$`, 'i') } });

    if (existingUsername) {
      response.status(400).json({ error: 'Username already taken' });
      return;
    }

    const user = await User.create({
      email,
      username,
      password: await bcrypt.hash(password, 10),
    });

    await createAuthenticatedBrowserSession(response, user._id.toString());
    response.json(serializeAuthResponse(user));
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function login(request: Request, response: Response) {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';

    if (!email || !password) {
      response.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password || ''))) {
      response.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.mfaEnabled) {
      response.json({
        email: user.email,
        mfaToken: createMfaChallengeToken(user._id.toString()),
        requiresMFA: true,
      });
      return;
    }

    await createAuthenticatedBrowserSession(response, user._id.toString());
    response.json(serializeAuthResponse(user));
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function verifyLoginMfa(request: Request, response: Response) {
  try {
    const challengeToken =
      typeof request.body.mfaToken === 'string' ? request.body.mfaToken.trim() : '';
    const totpToken = typeof request.body.token === 'string' ? request.body.token.trim() : '';

    if (!challengeToken || !totpToken) {
      response.status(400).json({ error: 'MFA challenge token and code are required' });
      return;
    }

    const userId = verifyMfaChallengeToken(challengeToken);
    const user = await User.findById(userId).select('+mfaSecret');

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      response.status(400).json({ error: 'MFA is not enabled for this account' });
      return;
    }

    if (!verifyMfaToken(user.mfaSecret, totpToken.replace(/\s+/g, ''))) {
      response.status(400).json({ error: 'Invalid MFA token' });
      return;
    }

    await createAuthenticatedBrowserSession(response, user._id.toString());
    response.json({
      token: createAuthToken(user._id.toString()),
      user: {
        email: user.email,
        id: user._id.toString(),
        mfaEnabled: true,
        username: user.username || user.email.split('@')[0],
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === 'Invalid MFA challenge token' ? 401 : 500;
    response.status(status).json({ error: status === 401 ? message : getErrorMessage(error) });
  }
}

export async function checkUsername(request: Request, response: Response) {
  try {
    const username =
      typeof request.params.username === 'string' ? request.params.username.trim() : '';

    if (!username) {
      response.status(400).json({ error: 'Username is required' });
      return;
    }

    const existingUser = await User.exists({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    response.json({ available: !existingUser });
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}
