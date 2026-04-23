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
  const base = API_URL.startsWith('http')
    ? API_URL
    : window.location.origin;

  let url = API_URL.startsWith('http')
  ? `${API_URL}/api/auth/google`
  : `${window.location.origin}${API_URL}/auth/google`;

  if (returnTo) {
    url += `?returnTo=${encodeURIComponent(returnTo)}`;
  }

  window.location.href = url;
}
