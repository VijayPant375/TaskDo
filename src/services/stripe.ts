import { apiGet, apiPost } from './api';
import { PRICING, type BillingPeriod, type SubscriptionStatus } from '../types/subscription';

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

  const session = await apiPost<CheckoutSessionResponse>('/api/create-checkout-session', payload);
  window.location.assign(session.url);
}

export function verifySubscription(sessionId: string) {
  return apiPost<VerifySubscriptionResponse>('/api/verify-subscription', { sessionId });
}

export async function openCustomerPortal() {
  const session = await apiPost<PortalSessionResponse>('/api/create-portal-session', {
    returnUrl: window.location.origin,
  });

  window.location.assign(session.url);
}

export function fetchCurrentSubscription() {
  return apiGet<SubscriptionStatus>('/api/subscription');
}

export function refreshCurrentSubscription() {
  return apiPost<SubscriptionStatus>('/api/subscription/refresh');
}
