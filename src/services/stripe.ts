import { PRICING, type BillingPeriod } from '../types/subscription';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface CheckoutSessionResponse {
  url: string;
}

interface VerifySubscriptionResponse {
  billingPeriod: BillingPeriod;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  customerId: string;
  subscriptionId: string;
}

interface PortalSessionResponse {
  url: string;
}

export interface SubscriptionStatusResponse {
  billingPeriod: BillingPeriod | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  customerId: string;
  isPremium: boolean;
  status: string;
  subscriptionId: string;
}

async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function redirectToCheckout(billingPeriod: BillingPeriod) {
  const priceId = PRICING[billingPeriod].priceId;

  if (!priceId) {
    throw new Error(`Missing Stripe price ID for ${billingPeriod} plan.`);
  }

  const payload = {
    billingPeriod,
    successUrl: `${window.location.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}/?checkout=canceled`,
  };

  const session = await postJson<CheckoutSessionResponse>('/api/create-checkout-session', payload);
  window.location.assign(session.url);
}

export function verifySubscription(sessionId: string) {
  return postJson<VerifySubscriptionResponse>('/api/verify-subscription', { sessionId });
}

export async function openCustomerPortal(customerId: string) {
  const session = await postJson<PortalSessionResponse>('/api/create-portal-session', {
    customerId,
    returnUrl: window.location.origin,
  });

  window.location.assign(session.url);
}

export function fetchSubscriptionStatus(subscriptionId: string) {
  return postJson<SubscriptionStatusResponse>('/api/subscription-status', { subscriptionId });
}
