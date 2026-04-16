import { API_URL, apiGet, apiPost } from './api';
import type { AuthSessionResponse } from '../types/auth';

export function fetchAuthSession() {
  return apiGet<AuthSessionResponse>('/api/auth/session');
}

export async function logout() {
  await apiPost('/api/auth/logout');
}

export async function refreshAuthSession() {
  await apiPost('/api/auth/refresh');
  return fetchAuthSession();
}

export function startGoogleSignIn(returnTo?: string) {
  const baseUrl = API_URL || window.location.origin;
  const url = new URL('/api/auth/google', baseUrl);
  if (returnTo) {
    url.searchParams.set('returnTo', returnTo);
  }

  window.location.href = url.toString();
}
