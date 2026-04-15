import { Calendar, CreditCard, Crown, X } from 'lucide-react';
import { openCustomerPortal } from '../../services/stripe';
import { FREE_TASK_LIMIT } from '../../types/subscription';
import { useSubscription } from '../../context/SubscriptionContext';
import { PremiumBadge } from './PremiumBadge';
import { SettingsMFA } from './SettingsMFA';
import { Button } from './ui/button';
import { useAuth } from '../../context/AuthContext';

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
  const { googleOAuthEnabled, isAuthenticated, signInWithGoogle, signOut, user } = useAuth();
  const renewalDate = formatDate(subscriptionStatus.currentPeriodEnd);
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'T';

  const handleManageSubscription = async () => {
    if (!subscriptionStatus.stripeCustomerId) {
      return;
    }

    try {
      await openCustomerPortal();
    } catch (error) {
      console.error('Failed to open Stripe Customer Portal.', error);
      window.alert('Unable to open subscription management right now.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-5 pb-24 sm:py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your plan and app details.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {userInitial}
              </div>
              <div>
                <h2 className="text-lg font-semibold">Account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isAuthenticated && user
                    ? 'Your account is active and TaskDo is syncing tasks from the backend.'
                    : googleOAuthEnabled
                      ? 'Sign in with Google to sync your tasks across devices.'
                      : 'Google OAuth is scaffolded and waiting for the final API keys.'}
                </p>
              </div>
            </div>

            {isAuthenticated && user ? (
              <div className="mb-5 rounded-2xl border bg-muted/40 p-4">
                <p className="font-medium">{user.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              </div>
            ) : null}

            {isAuthenticated ? (
              <Button className="w-full" onClick={() => void signOut()} variant="outline">
                Sign out
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={!googleOAuthEnabled}
                onClick={signInWithGoogle}
                variant="outline"
              >
                Continue with Google
              </Button>
            )}
          </section>

          {isAuthenticated ? <SettingsMFA /> : null}

          <section className="rounded-3xl border bg-card p-5 sm:p-6">
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

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-sm font-medium">Active task count</p>
                <p className="mt-1 text-3xl font-bold">
                  {activeTaskCount}
                  {!isPremium ? <span className="text-lg text-muted-foreground"> / {FREE_TASK_LIMIT}</span> : null}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-medium">Premium pricing</p>
                <p className="mt-1 text-lg font-semibold">$4.99 monthly</p>
                <p className="text-sm text-muted-foreground">$49.99 yearly</p>
              </div>
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

          <section className="rounded-3xl border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">About TaskDo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              TaskDo is an account-based task manager with reminders, priorities, synced backend storage, and a freemium subscription flow.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
