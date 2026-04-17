import { API_URL } from '../services/api';
import type { AuthResponse, AuthSubmission } from '../types/auth';

const AUTH_API_BASE = API_URL === '/api' ? '/api/auth' : `${API_URL}/api/auth`;

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || 'Authentication request failed.';
  } catch {
    return 'Authentication request failed.';
  }
}

export async function signup(data: AuthSubmission) {
  const response = await fetch(`${AUTH_API_BASE}/signup`, {
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as AuthResponse;
}

export async function login(data: Pick<AuthSubmission, 'email' | 'password'>) {
  const response = await fetch(`${AUTH_API_BASE}/login`, {
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const result = (await response.json()) as AuthResponse;

  if (result.requiresMFA) {
    return { requiresMFA: true, email: result.email, mfaToken: result.mfaToken };
  }

  return result;
}

export async function verifyLoginMFA(data: { mfaToken: string; token: string }) {
  const response = await fetch(`${AUTH_API_BASE}/login/mfa`, {
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as AuthResponse;
}

export async function checkUsername(username: string) {
  const response = await fetch(
    `${AUTH_API_BASE}/check-username/${encodeURIComponent(username.trim())}`
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { available: boolean };
  return payload.available;
}

export async function updateUsername(username: string) {
  const response = await fetch(`${API_URL === '/api' ? '' : API_URL}/api/user/username`, {
    body: JSON.stringify({ username }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as { success: boolean; username: string };
}
