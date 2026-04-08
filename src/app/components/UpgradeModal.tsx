import { useState } from 'react';
import { Check, X, Zap } from 'lucide-react';
import { PREMIUM_FEATURES_LIST, PRICING, type BillingPeriod } from '../../types/subscription';
import { redirectToCheckout } from '../../services/stripe';
import { Button } from './ui/button';

interface UpgradeModalProps {
  featureName?: string;
  onClose: () => void;
  trigger?: 'manual' | 'task_limit' | 'feature_locked';
}

function getCopy(trigger: UpgradeModalProps['trigger'], featureName?: string) {
  if (trigger === 'task_limit') {
    return {
      title: 'You reached the free task limit',
      subtitle: 'Upgrade to keep adding tasks without deleting active ones.',
    };
  }

  if (trigger === 'feature_locked') {
    return {
      title: `${featureName ?? 'This feature'} is part of Premium`,
      subtitle: 'Unlock the full plan to keep your workflow growing with TaskDo.',
    };
  }

  return {
    title: 'Upgrade to TaskDo Premium',
    subtitle: 'Get unlimited task capacity and a billing setup that is ready for future premium features.',
  };
}

export function UpgradeModal({ featureName, onClose, trigger = 'manual' }: UpgradeModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('yearly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = getCopy(trigger, featureName);
  const isYearly = billingPeriod === 'yearly';

  const handleUpgrade = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await redirectToCheckout(billingPeriod);
    } catch (upgradeError) {
      console.error('Failed to start Stripe Checkout.', upgradeError);
      setError(upgradeError instanceof Error ? upgradeError.message : 'Unable to start checkout.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-3xl border bg-background shadow-2xl">
        <div className="border-b p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 text-white">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{copy.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-2xl bg-muted p-1">
            <button
              className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                billingPeriod === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
              onClick={() => setBillingPeriod('monthly')}
              type="button"
            >
              Monthly
            </button>
            <button
              className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                isYearly ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
              onClick={() => setBillingPeriod('yearly')}
              type="button"
            >
              Yearly
            </button>
          </div>

          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold">
                ${isYearly ? (PRICING.yearly.amount / 12).toFixed(2) : PRICING.monthly.amount.toFixed(2)}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isYearly
                ? `${PRICING.yearly.savingsLabel} with annual billing at $${PRICING.yearly.amount.toFixed(2)}`
                : 'Billed monthly at $4.99'}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {PREMIUM_FEATURES_LIST.map((feature) => (
              <div key={feature.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{feature.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            className="h-12 w-full bg-gradient-to-r from-amber-500 to-orange-500 text-base hover:from-amber-600 hover:to-orange-600"
            disabled={isSubmitting}
            onClick={handleUpgrade}
            size="lg"
          >
            {isSubmitting ? 'Opening checkout...' : 'Continue to Stripe Checkout'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">Cancel anytime in the customer portal.</p>
        </div>
      </div>
    </div>
  );
}
