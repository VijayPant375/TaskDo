const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL =
  configuredApiUrl && configuredApiUrl.length > 0
    ? configuredApiUrl.replace(/\/$/, '')
    : import.meta.env.PROD
      ? '/api'
      : 'http://localhost:3001';
const authTokenStorageKey = 'taskdo.token';

async function request<T>(path: string, init?: RequestInit, retryOnUnauthorized = true): Promise<T> {
  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem(authTokenStorageKey) : null;

  const normalizedPath = API_URL === '/api' && path.startsWith('/api') ? path.replace(/^\/api/, '') : path;

  const response = await fetch(`${API_URL}${normalizedPath}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
      credentials: 'include',
      method: 'POST',
    });

    if (refreshResponse.ok) {
      return request<T>(path, init, false);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string) {
  return request<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, payload?: unknown) {
  return request<T>(path, {
    body: payload ? JSON.stringify(payload) : undefined,
    method: 'POST',
  });
}

export function apiPut<T>(path: string, payload: unknown) {
  return request<T>(path, {
    body: JSON.stringify(payload),
    method: 'PUT',
  });
}

export function apiDelete<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

export { API_URL };
