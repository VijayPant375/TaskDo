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
  const url = new URL(`${API_URL}/api/auth/google/start`);
  if (returnTo) {
    url.searchParams.set('returnTo', returnTo);
  }

  window.location.assign(url.toString());
}
