import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticate(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
) {
  const token = request.headers.authorization?.split(' ')[1];

  if (!token) {
    response.status(401).json({ error: 'No token' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id?: string };
    request.userId = payload.id;
    next();
  } catch {
    response.status(401).json({ error: 'Invalid token' });
  }
}

export function getBearerUserId(request: Request) {
  const token = request.headers.authorization?.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id?: string };
    return typeof payload.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}
