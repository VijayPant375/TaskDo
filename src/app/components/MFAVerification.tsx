import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';

interface MFAVerificationProps {
  email: string;
  error?: string;
  helpText?: string;
  isSubmitting?: boolean;
  onBack: () => void;
  onSubmit: (token: string) => Promise<void>;
}

export function MFAVerification({
  email,
  error,
  helpText,
  isSubmitting = false,
  onBack,
  onSubmit,
}: MFAVerificationProps) {
  const [token, setToken] = useState('');

  const handleSubmit = async () => {
    if (token.length !== 6 || isSubmitting) {
      return;
    }

    await onSubmit(token);
  };

  return (
    <div className="screen-transition relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_26%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl items-center justify-center">
        <div className="surface-panel w-full max-w-xl rounded-[2rem] border border-white/20 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)] sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Second step</p>
                <h2 className="text-2xl font-semibold">Verify your sign-in</h2>
              </div>
            </div>

            <Button onClick={onBack} size="icon" variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <p className="text-sm leading-7 text-muted-foreground">
            Enter the 6-digit code from your authenticator app for <span className="font-medium text-foreground">{email}</span>.
          </p>

          {helpText ? (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
              {helpText}
            </div>
          ) : null}

          <div className="mt-8 flex justify-center">
            <InputOTP
              containerClassName="justify-center"
              maxLength={6}
              onChange={setToken}
              pattern="^[0-9]+$"
              value={token}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="h-12 w-12 text-base" />
                <InputOTPSlot index={1} className="h-12 w-12 text-base" />
                <InputOTPSlot index={2} className="h-12 w-12 text-base" />
                <InputOTPSlot index={3} className="h-12 w-12 text-base" />
                <InputOTPSlot index={4} className="h-12 w-12 text-base" />
                <InputOTPSlot index={5} className="h-12 w-12 text-base" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error ? <p className="mt-4 text-center text-sm text-rose-500">{error}</p> : null}

          <div className="mt-8 space-y-3">
            <Button
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-base text-white hover:from-amber-600 hover:to-orange-600"
              disabled={isSubmitting || token.length !== 6}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify code
            </Button>
            <Button className="h-12 w-full rounded-2xl" onClick={onBack} variant="outline">
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
