import type { SubscriptionStatus } from '../types/subscription';

const STORAGE_KEY = 'taskdo.subscription';

const defaultSubscription: SubscriptionStatus = {
  tier: 'free',
};

export function readStoredSubscription(): SubscriptionStatus {
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

export function writeStoredSubscription(subscriptionStatus: SubscriptionStatus) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptionStatus));
  } catch (error) {
    console.error('Failed to persist subscription status.', error);
  }
}

export function clearStoredSubscription() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear subscription status from storage.', error);
  }
}

export function getSubscriptionStorageKey() {
  return STORAGE_KEY;
}

export function getDefaultSubscriptionStatus(): SubscriptionStatus {
  return defaultSubscription;
}
