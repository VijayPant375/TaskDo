import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as loginRequest, signup as signupRequest } from '../api/auth';
import { fetchAuthSession, logout as logoutRequest, startGoogleSignIn } from '../services/auth';
import { verifyMFA as verifyMFARequest } from '../services/mfa';
import type { AuthResponse, AuthSubmission, AuthUser } from '../types/auth';

const authTokenStorageKey = 'taskdo.token';
const authUserStorageKey = 'taskdo.user';

function mapAuthResponseUser(payload: AuthResponse['user']): AuthUser {
  return {
    avatarUrl: null,
    email: payload.email,
    id: payload.id,
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

function redirectToApp() {
  if (window.location.pathname !== '/app') {
    window.location.assign('/app');
    return;
  }

  window.history.replaceState({}, '', '/app');
}

interface AuthContextValue {
  googleOAuthEnabled: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (credentials: Pick<AuthSubmission, 'email' | 'password'>) => Promise<void>;
  mfaChallengeEmail: string | null;
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
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [mfaChallengeEmail, setMfaChallengeEmail] = useState<string | null>(null);

  const refreshSession = async () => {
    setIsLoading(true);

    try {
      const url = new URL(window.location.href);
      const tokenFromRedirect = url.searchParams.get('token');
      const session = await fetchAuthSession();
      setGoogleOAuthEnabled(session.googleOAuthEnabled);

      if (session.user) {
        setUser(session.user);

        if (tokenFromRedirect) {
          storeAuthenticatedUser(tokenFromRedirect, session.user);
          url.searchParams.delete('token');
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        }

        return;
      }

      if (tokenFromRedirect) {
        localStorage.setItem(authTokenStorageKey, tokenFromRedirect);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }

      const storedToken = localStorage.getItem(authTokenStorageKey);
      const storedUser = readStoredUser();
      setUser(storedToken && storedUser ? storedUser : null);
    } catch (error) {
      console.error('Failed to load auth session.', error);
      const storedToken = localStorage.getItem(authTokenStorageKey);
      const storedUser = readStoredUser();
      setUser(storedToken && storedUser ? storedUser : null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      googleOAuthEnabled,
      isAuthenticated: Boolean(user),
      isLoading,
      loginWithPassword: async (credentials) => {
        const response = await loginRequest(credentials);
        if (response.requiresMFA && response.email) {
          clearStoredAuthentication();
          setUser(null);
          setMfaChallengeEmail(response.email);
          return;
        }

        if (!response.token || !response.user) {
          throw new Error('Authentication response is incomplete.');
        }

        const nextUser = mapAuthResponseUser(response.user);
        storeAuthenticatedUser(response.token, nextUser);
        setMfaChallengeEmail(null);
        setUser(nextUser);
        redirectToApp();
      },
      mfaChallengeEmail,
      clearMfaChallenge: () => setMfaChallengeEmail(null),
      completeMfaChallenge: async (token) => {
        try {
          await verifyMFARequest(token);
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(
              error.message ||
                'MFA verification could not be completed for password sign-in yet.'
            );
          }

          throw new Error('MFA verification could not be completed for password sign-in yet.');
        }

        throw new Error(
          'Your backend currently verifies MFA only for authenticated sessions. Add a login completion endpoint before password sign-in can finish with MFA.'
        );
      },
      refreshSession,
      signInWithGoogle: () => {
        startGoogleSignIn('/app');
      },
      signUpWithPassword: async (credentials) => {
        const response = await signupRequest(credentials);
        if (!response.token || !response.user) {
          throw new Error('Authentication response is incomplete.');
        }

        const nextUser = mapAuthResponseUser(response.user);
        storeAuthenticatedUser(response.token, nextUser);
        setMfaChallengeEmail(null);
        setUser(nextUser);
        redirectToApp();
      },
      signOut: async () => {
        clearStoredAuthentication();
        setMfaChallengeEmail(null);
        await logoutRequest();
        setUser(null);
      },
      user,
    }),
    [googleOAuthEnabled, isLoading, mfaChallengeEmail, user]
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
