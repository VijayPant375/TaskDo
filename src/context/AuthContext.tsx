import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as loginRequest, signup as signupRequest, verifyLoginMFA } from '../api/auth';
import { fetchAuthSession, logout as logoutRequest, startGoogleSignIn } from '../services/auth';
import type { AuthResponse, AuthSubmission, AuthUser } from '../types/auth';

const authTokenStorageKey = 'taskdo.token';
const authUserStorageKey = 'taskdo.user';

function mapAuthResponseUser(payload: AuthResponse['user']): AuthUser {
  if (!payload) {
    throw new Error('Authentication response is incomplete.');
  }

  return {
    avatarUrl: null,
    email: payload.email,
    id: payload.id,
    mfaEnabled: payload.mfaEnabled,
    name: payload.username,
    username: payload.username,
  };
}

function readStoredUser() {
  const raw = localStorage.getItem(authUserStorageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(authUserStorageKey);
    return null;
  }
}

function storeAuthenticatedUser(token: string, user: AuthUser) {
  localStorage.setItem(authTokenStorageKey, token);
  localStorage.setItem(authUserStorageKey, JSON.stringify(user));
}

function clearStoredAuthentication() {
  localStorage.removeItem(authTokenStorageKey);
  localStorage.removeItem(authUserStorageKey);
}

function clearAuthRedirectParams(url: URL) {
  url.searchParams.delete('email');
  url.searchParams.delete('mfa');
  url.searchParams.delete('mfaToken');
  url.searchParams.delete('token');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function redirectToApp() {
  if (window.location.pathname !== '/dashboard') {
    window.location.assign('/dashboard');
    return;
  }

  window.history.replaceState({}, '', '/dashboard');
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (credentials: Pick<AuthSubmission, 'email' | 'password'>) => Promise<void>;
  mfaChallengeEmail: string | null;
  mfaChallengeToken: string | null;
  clearMfaChallenge: () => void;
  completeMfaChallenge: (token: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  signInWithGoogle: () => void;
  signUpWithPassword: (credentials: AuthSubmission) => Promise<void>;
  signOut: () => Promise<void>;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaChallengeEmail, setMfaChallengeEmail] = useState<string | null>(null);
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);

  const refreshSession = async () => {
    setIsLoading(true);

    try {
      const url = new URL(window.location.href);
      const mfaRequiredFromRedirect = url.searchParams.get('mfa') === 'required';
      const emailFromRedirect = url.searchParams.get('email');
      const mfaTokenFromRedirect = url.searchParams.get('mfaToken');
      const tokenFromRedirect = url.searchParams.get('token');

      if (mfaRequiredFromRedirect && emailFromRedirect && mfaTokenFromRedirect) {
        clearStoredAuthentication();
        setUser(null);
        setMfaChallengeEmail(emailFromRedirect);
        setMfaChallengeToken(mfaTokenFromRedirect);
        clearAuthRedirectParams(url);
        return;
      }

      if (tokenFromRedirect) {
        localStorage.setItem(authTokenStorageKey, tokenFromRedirect);
      }

      const session = await fetchAuthSession();

      if (session.user) {
        const sessionUser: AuthUser = {
          ...session.user,
          username: session.user.username ?? session.user.name,
        };
        setUser(sessionUser);
        setMfaChallengeEmail(null);
        setMfaChallengeToken(null);

        if (tokenFromRedirect) {
          storeAuthenticatedUser(tokenFromRedirect, sessionUser);
          clearAuthRedirectParams(url);
        } else {
          const storedToken = localStorage.getItem(authTokenStorageKey);
          if (storedToken) {
            storeAuthenticatedUser(storedToken, sessionUser);
          }
        }

        return;
      }

      clearStoredAuthentication();
      setUser(null);
      if (tokenFromRedirect) {
        clearAuthRedirectParams(url);
      }
    } catch (error) {
      console.error('Failed to load auth session.', error);
      clearStoredAuthentication();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      isLoading,
      loginWithPassword: async (credentials) => {
        const response = await loginRequest(credentials);
        if (response.requiresMFA && response.email && response.mfaToken) {
          clearStoredAuthentication();
          setUser(null);
          setMfaChallengeEmail(response.email);
          setMfaChallengeToken(response.mfaToken);
          return;
        }

        if (!response.token || !response.user) {
          throw new Error('Authentication response is incomplete.');
        }

        const nextUser = mapAuthResponseUser(response.user);
        storeAuthenticatedUser(response.token, nextUser);
        setMfaChallengeEmail(null);
        setMfaChallengeToken(null);
        setUser(nextUser);
        redirectToApp();
      },
      mfaChallengeEmail,
      mfaChallengeToken,
      clearMfaChallenge: () => {
        setMfaChallengeEmail(null);
        setMfaChallengeToken(null);
      },
      completeMfaChallenge: async (token) => {
        if (!mfaChallengeToken) {
          throw new Error('MFA challenge has expired. Please sign in again.');
        }

        const response = await verifyLoginMFA({ mfaToken: mfaChallengeToken, token });
        if (!response.token || !response.user) {
          throw new Error('Authentication response is incomplete.');
        }

        const nextUser = mapAuthResponseUser(response.user);
        storeAuthenticatedUser(response.token, nextUser);
        setMfaChallengeEmail(null);
        setMfaChallengeToken(null);
        setUser(nextUser);
        redirectToApp();
      },
      refreshSession,
      signInWithGoogle: () => {
        startGoogleSignIn('/dashboard');
      },
      signUpWithPassword: async (credentials) => {
        const response = await signupRequest(credentials);
        if (!response.token || !response.user) {
          throw new Error('Authentication response is incomplete.');
        }

        const nextUser = mapAuthResponseUser(response.user);
        storeAuthenticatedUser(response.token, nextUser);
        setMfaChallengeEmail(null);
        setMfaChallengeToken(null);
        setUser(nextUser);
        redirectToApp();
      },
      signOut: async () => {
        clearStoredAuthentication();
        setMfaChallengeEmail(null);
        setMfaChallengeToken(null);
        await logoutRequest();
        setUser(null);
      },
      user,
    }),
    [isLoading, mfaChallengeEmail, mfaChallengeToken, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
