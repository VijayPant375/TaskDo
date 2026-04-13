import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchAuthSession, logout as logoutRequest, startGoogleSignIn } from '../services/auth';
import type { AuthUser } from '../types/auth';

interface AuthContextValue {
  googleOAuthEnabled: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  const refreshSession = async () => {
    setIsLoading(true);

    try {
      const session = await fetchAuthSession();
      setUser(session.user);
      setGoogleOAuthEnabled(session.googleOAuthEnabled);
    } catch (error) {
      console.error('Failed to load auth session.', error);
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
      googleOAuthEnabled,
      isAuthenticated: Boolean(user),
      isLoading,
      refreshSession,
      signInWithGoogle: () => {
        startGoogleSignIn(window.location.href);
      },
      signOut: async () => {
        await logoutRequest();
        setUser(null);
      },
      user,
    }),
    [googleOAuthEnabled, isLoading, user]
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
