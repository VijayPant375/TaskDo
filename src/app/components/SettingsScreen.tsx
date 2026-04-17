import { useEffect, useState } from 'react';
import { Calendar, CreditCard, Crown, X, CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { checkUsername, updateUsername } from '../../api/auth';
import { Input } from './ui/input';
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
  const { isAuthenticated, signInWithGoogle, signOut, user, refreshSession } = useAuth();
  const renewalDate = formatDate(subscriptionStatus.currentPeriodEnd);
  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'T';

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameState, setUsernameState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameSaveError, setUsernameSaveError] = useState('');

  useEffect(() => {
    if (!isEditingUsername) {
      setUsernameState('idle');
      return;
    }

    const trimmedUsername = newUsername.trim();

    if (!trimmedUsername || trimmedUsername === user?.name) {
      setUsernameState('idle');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      setUsernameState('invalid');
      return;
    }

    setUsernameState('checking');
    const timeoutId = window.setTimeout(() => {
      void checkUsername(trimmedUsername)
        .then((available) => {
          setUsernameState(available ? 'available' : 'taken');
        })
        .catch(() => {
          setUsernameState('idle');
        });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [isEditingUsername, newUsername, user?.name]);

  const handleSaveUsername = async () => {
    if (usernameState !== 'available') return;
    setIsSavingUsername(true);
    setUsernameSaveError('');
    try {
      await updateUsername(newUsername.trim());
      await refreshSession();
      setIsEditingUsername(false);
    } catch (error) {
      setUsernameSaveError(error instanceof Error ? error.message : 'Unable to update username');
    } finally {
      setIsSavingUsername(false);
    }
  };

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
                    : 'Sign in with Google to sync your tasks across devices.'}
                </p>
              </div>
            </div>

            {isAuthenticated && user ? (
              <div className="mb-5 space-y-4 rounded-2xl border bg-muted/40 p-4">
                {isEditingUsername ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Edit Username</p>
                    <div className="relative">
                      <Input 
                        className="h-10 pr-10"
                        value={newUsername} 
                        onChange={(e) => setNewUsername(e.target.value)} 
                        placeholder="New username" 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {usernameState === 'checking' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                        {usernameState === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
                        {usernameState === 'taken' || usernameState === 'invalid' ? (
                          <XCircle className="h-4 w-4 text-rose-500" />
                        ) : null}
                      </div>
                    </div>
                    {usernameState === 'invalid' ? (
                      <p className="text-xs text-rose-500">Use 3-20 letters, numbers, or underscores.</p>
                    ) : null}
                    {usernameState === 'taken' ? (
                      <p className="text-xs text-rose-500">Username already taken.</p>
                    ) : null}
                    {usernameSaveError && <p className="text-xs text-rose-500">{usernameSaveError}</p>}
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600" onClick={() => void handleSaveUsername()} disabled={isSavingUsername || usernameState !== 'available'}>
                        {isSavingUsername ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingUsername(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setIsEditingUsername(true); setNewUsername(user.name); setUsernameSaveError(''); }}>
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {isAuthenticated ? (
              <Button className="w-full" onClick={() => void signOut()} variant="outline">
                Sign out
              </Button>
            ) : (
              <Button className="w-full" onClick={signInWithGoogle} variant="outline">
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
