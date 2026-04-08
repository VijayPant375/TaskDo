import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FREE_TASK_LIMIT, type SubscriptionStatus } from '../types/subscription';

interface SubscriptionContextValue {
  subscriptionStatus: SubscriptionStatus;
  isPremium: boolean;
  canCreateTask: (currentActiveTaskCount: number) => boolean;
  updateSubscription: (status: SubscriptionStatus) => void;
  clearSubscription: () => void;
}

const STORAGE_KEY = 'taskdo.subscription';

const defaultSubscription: SubscriptionStatus = {
  tier: 'free',
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

function readStoredSubscription(): SubscriptionStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSubscription;
    }

    const parsed = JSON.parse(raw) as SubscriptionStatus;
    return parsed?.tier ? parsed : defaultSubscription;
  } catch (error) {
    console.error('Failed to read subscription status from storage.', error);
    return defaultSubscription;
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(defaultSubscription);

  useEffect(() => {
    setSubscriptionStatus(readStoredSubscription());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptionStatus));
    } catch (error) {
      console.error('Failed to persist subscription status.', error);
    }
  }, [subscriptionStatus]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setSubscriptionStatus(readStoredSubscription());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo<SubscriptionContextValue>(() => {
    const isPremium = subscriptionStatus.tier === 'premium';

    return {
      subscriptionStatus,
      isPremium,
      canCreateTask: (currentActiveTaskCount: number) => {
        if (isPremium) {
          return true;
        }

        return currentActiveTaskCount < FREE_TASK_LIMIT;
      },
      updateSubscription: (status: SubscriptionStatus) => {
        setSubscriptionStatus(status);
      },
      clearSubscription: () => {
        setSubscriptionStatus(defaultSubscription);
      },
    };
  }, [subscriptionStatus]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider.');
  }

  return context;
}
