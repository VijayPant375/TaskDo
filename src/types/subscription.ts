export type BillingPeriod = 'monthly' | 'yearly';

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingPeriod?: BillingPeriod;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
}

export const FREE_TASK_LIMIT = 50;

export const PREMIUM_FEATURES_LIST: PremiumFeature[] = [
  {
    id: 'unlimited-tasks',
    name: 'Unlimited tasks',
    description: 'Create as many active tasks as you need without hitting the free plan cap.',
  },
  {
    id: 'priority-workflows',
    name: 'Priority workflows',
    description: 'Keep growing into premium-only features like advanced organization and automation.',
  },
  {
    id: 'future-premium-features',
    name: 'Future premium unlocks',
    description: 'Your premium plan is ready for recurring tasks, analytics, exports, and more.',
  },
  {
    id: 'customer-portal',
    name: 'Self-serve billing',
    description: 'Manage payment methods and cancellations through Stripe Customer Portal.',
  },
];

export const PRICING = {
  monthly: {
    amount: 4.99,
    label: 'Monthly',
  },
  yearly: {
    amount: 49.99,
    label: 'Yearly',
    savingsLabel: 'Save 18%',
  },
} as const;
