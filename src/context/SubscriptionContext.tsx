import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchCurrentSubscription, refreshCurrentSubscription } from '../services/stripe';
import { FREE_TASK_LIMIT, type SubscriptionStatus } from '../types/subscription';
import {
  clearStoredSubscription,
  getDefaultSubscriptionStatus,
  getSubscriptionStorageKey,
  readStoredSubscription,
  writeStoredSubscription,
} from '../services/subscriptionStorage';

interface SubscriptionContextValue {
  subscriptionStatus: SubscriptionStatus;
  isPremium: boolean;
  isRefreshing: boolean;
  canCreateTask: (currentActiveTaskCount: number) => boolean;
  refreshSubscription: () => Promise<void>;
  updateSubscription: (status: SubscriptionStatus) => void;
  clearSubscription: () => void;
}

const defaultSubscription: SubscriptionStatus = getDefaultSubscriptionStatus();

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(defaultSubscription);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSubscriptionFromServer = async (mode: 'initial' | 'refresh' = 'initial') => {
    setIsRefreshing(true);

    try {
      const latest =
        mode === 'refresh' ? await refreshCurrentSubscription() : await fetchCurrentSubscription();

      setSubscriptionStatus(latest);
    } catch (error) {
      console.error('Failed to load subscription state from the server.', error);
      if (mode === 'initial') {
        setSubscriptionStatus(readStoredSubscription());
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setSubscriptionStatus(readStoredSubscription());
  }, []);

  useEffect(() => {
    writeStoredSubscription(subscriptionStatus);
  }, [subscriptionStatus]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getSubscriptionStorageKey()) {
        setSubscriptionStatus(readStoredSubscription());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setSubscriptionStatus(defaultSubscription);
      clearStoredSubscription();
      return;
    }

    void loadSubscriptionFromServer();
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const refreshOnFocus = () => {
      if (!document.hidden) {
        void loadSubscriptionFromServer('refresh');
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [isAuthenticated]);

  const value = useMemo<SubscriptionContextValue>(() => {
    const isPremium = subscriptionStatus.tier === 'premium';

    return {
      subscriptionStatus,
      isPremium,
      isRefreshing,
      canCreateTask: (currentActiveTaskCount: number) => {
        if (isPremium) {
          return true;
        }

        return currentActiveTaskCount < FREE_TASK_LIMIT;
      },
      refreshSubscription: async () => {
        if (!isAuthenticated) {
          setSubscriptionStatus(defaultSubscription);
          return;
        }

        await loadSubscriptionFromServer('refresh');
      },
      updateSubscription: (status: SubscriptionStatus) => {
        setSubscriptionStatus(status);
      },
      clearSubscription: () => {
        setSubscriptionStatus(defaultSubscription);
        clearStoredSubscription();
      },
    };
  }, [isAuthenticated, isRefreshing, subscriptionStatus]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider.');
  }

  return context;
}
