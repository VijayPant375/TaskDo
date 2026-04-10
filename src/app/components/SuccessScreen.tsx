import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { verifySubscription } from '../../services/stripe';
import { useSubscription } from '../../context/SubscriptionContext';
import { Button } from './ui/button';

interface SuccessScreenProps {
  onContinue: () => void;
  sessionId: string;
}

export function SuccessScreen({ onContinue, sessionId }: SuccessScreenProps) {
  const { updateSubscription } = useSubscription();
  const [state, setState] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const runVerification = async () => {
      try {
        const subscription = await verifySubscription(sessionId);

        if (!isMounted) {
          return;
        }

        updateSubscription({
          tier: 'premium',
          stripeCustomerId: subscription.customerId,
          stripeSubscriptionId: subscription.subscriptionId,
          billingPeriod: subscription.billingPeriod,
          currentPeriodEnd: subscription.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd * 1000).toISOString()
            : undefined,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        });
        setState('success');
      } catch (error) {
        console.error('Failed to verify Stripe subscription.', error);

        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to verify your payment.');
        setState('error');
      }
    };

    void runVerification();

    return () => {
      isMounted = false;
    };
  }, [sessionId, updateSubscription]);

  if (state === 'verifying') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Verifying your subscription</h1>
            <p className="mt-2 text-sm text-muted-foreground">Stripe payment completed. We are activating Premium now.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 w-fit rounded-full bg-destructive/10 p-4 text-destructive">
            <XCircle className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold">Verification failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <Button className="mt-6 w-full" onClick={onContinue}>
            Return to TaskDo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 w-fit rounded-full bg-green-500/10 p-4 text-green-600">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold">Premium is active</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your Stripe subscription is live and TaskDo now allows unlimited active tasks on your account.
        </p>
        <Button
          className="mt-6 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          onClick={onContinue}
        >
          Continue to TaskDo
        </Button>
      </div>
    </div>
  );
}
