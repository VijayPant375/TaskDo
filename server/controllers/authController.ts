import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { upsertLocalUser } from '../lib/store.js';
import { User } from '../models/User.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return secret;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function createAuthToken(userId: string) {
  return jwt.sign({ id: userId }, getJwtSecret());
}

export async function signup(request: Request, response: Response) {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const username = typeof request.body.username === 'string' ? request.body.username.trim() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';

    if (!email || !username || !password) {
      response.status(400).json({ error: 'Email, username, and password are required' });
      return;
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      response.status(400).json({ error: 'User already exists' });
      return;
    }

    const user = await User.create({
      email,
      password: await bcrypt.hash(password, 10),
      username,
    });

    const authUser = upsertLocalUser({
      email: user.email,
      id: user._id.toString(),
      name: user.username,
    });

    const token = createAuthToken(authUser.id);

    response.json({
      token,
      user: {
        email: user.email,
        id: authUser.id,
        username: user.username,
      },
    });
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

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password || ''))) {
      response.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.mfaEnabled) {
      response.json({ requiresMFA: true, email: user.email });
      return;
    }

    const authUser = upsertLocalUser({
      email: user.email,
      id: user._id.toString(),
      name: user.username,
    });

    const token = createAuthToken(authUser.id);

    response.json({
      token,
      user: {
        email: user.email,
        id: authUser.id,
        username: user.username,
      },
    });
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
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

    const existingUser = await User.exists({ username });
    response.json({ available: !existingUser });
  } catch (error) {
    response.status(500).json({ error: getErrorMessage(error) });
  }
}
