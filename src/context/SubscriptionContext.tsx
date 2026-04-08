import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchSubscriptionStatus } from '../services/stripe';
import { FREE_TASK_LIMIT, type SubscriptionStatus } from '../types/subscription';

interface SubscriptionContextValue {
  subscriptionStatus: SubscriptionStatus;
  isPremium: boolean;
  isRefreshing: boolean;
  canCreateTask: (currentActiveTaskCount: number) => boolean;
  refreshSubscription: () => Promise<void>;
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const syncSubscriptionFromStripe = async (subscriptionId: string) => {
    setIsRefreshing(true);

    try {
      const latest = await fetchSubscriptionStatus(subscriptionId);

      setSubscriptionStatus({
        tier: latest.isPremium ? 'premium' : 'free',
        stripeCustomerId: latest.customerId,
        stripeSubscriptionId: latest.subscriptionId,
        billingPeriod: latest.billingPeriod ?? undefined,
        currentPeriodEnd: latest.currentPeriodEnd
          ? new Date(latest.currentPeriodEnd * 1000).toISOString()
          : undefined,
        cancelAtPeriodEnd: latest.cancelAtPeriodEnd,
      });
    } catch (error) {
      console.error('Failed to refresh subscription from Stripe.', error);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  useEffect(() => {
    if (!subscriptionStatus.stripeSubscriptionId) {
      return;
    }

    void syncSubscriptionFromStripe(subscriptionStatus.stripeSubscriptionId);
  }, [subscriptionStatus.stripeSubscriptionId]);

  useEffect(() => {
    if (!subscriptionStatus.stripeSubscriptionId) {
      return;
    }

    const refreshOnFocus = () => {
      if (!document.hidden) {
        void syncSubscriptionFromStripe(subscriptionStatus.stripeSubscriptionId as string);
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [subscriptionStatus.stripeSubscriptionId]);

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
        if (!subscriptionStatus.stripeSubscriptionId) {
          setSubscriptionStatus(defaultSubscription);
          return;
        }

        await syncSubscriptionFromStripe(subscriptionStatus.stripeSubscriptionId);
      },
      updateSubscription: (status: SubscriptionStatus) => {
        setSubscriptionStatus(status);
      },
      clearSubscription: () => {
        setSubscriptionStatus(defaultSubscription);
      },
    };
  }, [isRefreshing, subscriptionStatus]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider.');
  }

  return context;
}
