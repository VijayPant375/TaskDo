import { Calendar, CreditCard, Crown, X } from 'lucide-react';
import { openCustomerPortal } from '../../services/stripe';
import { FREE_TASK_LIMIT } from '../../types/subscription';
import { useSubscription } from '../../context/SubscriptionContext';
import { PremiumBadge } from './PremiumBadge';
import { Button } from './ui/button';

interface SettingsScreenProps {
  activeTaskCount: number;
  onClose: () => void;
  onUpgrade: () => void;
}

function formatDate(value?: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function SettingsScreen({ activeTaskCount, onClose, onUpgrade }: SettingsScreenProps) {
  const { isPremium, subscriptionStatus } = useSubscription();
  const renewalDate = formatDate(subscriptionStatus.currentPeriodEnd);

  const handleManageSubscription = async () => {
    if (!subscriptionStatus.stripeCustomerId) {
      return;
    }

    try {
      await openCustomerPortal(subscriptionStatus.stripeCustomerId);
    } catch (error) {
      console.error('Failed to open Stripe Customer Portal.', error);
      window.alert('Unable to open subscription management right now.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your plan and app details.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-3 ${isPremium ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{isPremium ? 'Premium plan' : 'Free plan'}</h2>
                    {isPremium ? <PremiumBadge size="sm" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isPremium ? 'Unlimited tasks unlocked.' : `You can keep up to ${FREE_TASK_LIMIT} active tasks.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-muted/50 p-4">
              <p className="text-sm font-medium">Active task count</p>
              <p className="mt-1 text-3xl font-bold">
                {activeTaskCount}
                {!isPremium ? <span className="text-lg text-muted-foreground"> / {FREE_TASK_LIMIT}</span> : null}
              </p>
            </div>

            {isPremium ? (
              <div className="mt-6 space-y-4">
                {renewalDate ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {subscriptionStatus.cancelAtPeriodEnd ? 'Access ends on ' : 'Renews on '}
                      <span className="font-medium text-foreground">{renewalDate}</span>
                    </span>
                  </div>
                ) : null}

                <Button className="w-full" onClick={handleManageSubscription} variant="outline">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage subscription
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upgrade to remove the task cap and connect billing through Stripe.
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={onUpgrade}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Premium
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border bg-card p-6">
            <h2 className="text-lg font-semibold">About TaskDo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              TaskDo is a lightweight task manager with reminders, priorities, and a new freemium subscription flow.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
