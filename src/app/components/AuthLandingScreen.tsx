import { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, LoaderCircle, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { checkUsername } from '../../api/auth';
import { MFAVerification } from './MFAVerification';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AuthLandingScreenProps {
  isLoading: boolean;
  mfaChallengeEmail?: string | null;
  onCompleteMFA?: (token: string) => Promise<void>;
  onExitMFA?: () => void;
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  onContinueWithGoogle: () => void;
  onSignUp: (credentials: { email: string; username: string; password: string }) => Promise<void>;
}

const featureList = [
  'Secure sign-in with Google',
  'Tasks synced to your account',
  'Reminders, priorities, and premium controls',
];

export function AuthLandingScreen({
  isLoading,
  mfaChallengeEmail,
  onCompleteMFA,
  onExitMFA,
  onLogin,
  onContinueWithGoogle,
  onSignUp,
}: AuthLandingScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [usernameState, setUsernameState] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  useEffect(() => {
    if (mode !== 'signup') {
      setUsernameState('idle');
      return;
    }

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
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
  }, [mode, username]);

  if (mfaChallengeEmail && onCompleteMFA && onExitMFA) {
    return (
      <MFAVerification
        email={mfaChallengeEmail}
        error={error}
        isSubmitting={isVerifyingMfa}
        onBack={() => {
          setError('');
          onExitMFA();
        }}
        onSubmit={async (token) => {
          setError('');
          setIsVerifyingMfa(true);

          try {
            await onCompleteMFA(token);
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : 'Unable to verify MFA code.'
            );
          } finally {
            setIsVerifyingMfa(false);
          }
        }}
      />
    );
  }

  const isFormValid = () => {
    if (!email.trim() || !password) return false;
    if (mode === 'signup') {
      return usernameState === 'available';
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await onLogin({ email, password });
        return;
      }

      if (usernameState === 'taken' || usernameState === 'invalid' || usernameState === 'checking') {
        throw new Error('Choose an available username before signing up.');
      }

      await onSignUp({ email, password, username });
    } catch (submissionError) {
      let msg = submissionError instanceof Error ? submissionError.message : 'Unable to continue.';
      if (mode === 'signup' && msg === 'User already exists') {
        msg = 'Email already exists, try login.';
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const usernameIndicator =
    mode === 'signup' && usernameState !== 'idle' ? (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {usernameState === 'checking' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {usernameState === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
        {usernameState === 'taken' || usernameState === 'invalid' ? (
          <XCircle className="h-4 w-4 text-rose-500" />
        ) : null}
      </div>
    ) : null;

  return (
    <div className="screen-transition relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_26%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-5 lg:space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/80 px-3 py-1.5 text-sm text-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Structured work, calmer days
          </div>

          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-balance sm:text-5xl lg:text-6xl">
              TaskDo turns scattered work into a focused daily system.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Sign in once, keep every task in your account, and pick up your day from any device
              without depending on browser-local storage.
            </p>
          </div>

          <div className="grid gap-3 sm:max-w-lg">
            {featureList.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/80 px-4 py-3 shadow-sm backdrop-blur"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-amber-400/20 via-white/10 to-sky-400/20 blur-2xl" />
          <div className="surface-panel relative rounded-[2rem] border border-white/20 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] sm:p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
                <Cloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Welcome to</p>
                <h2 className="text-2xl font-semibold">TaskDo</h2>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Welcome to TaskDo
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                Sign in with your account details or Google and keep your work flowing across devices.
              </p>
            </div>

            <div className="mt-8 inline-flex w-full rounded-2xl border border-border/70 bg-muted/60 p-1">
              <button
                type="button"
                className={`flex-1 rounded-[1rem] px-4 py-2.5 text-sm font-medium transition ${
                  mode === 'login' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={`flex-1 rounded-[1rem] px-4 py-2.5 text-sm font-medium transition ${
                  mode === 'signup' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
              >
                Sign Up
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {mode === 'signup' ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Username</label>
                  <div className="relative">
                    <Input
                      className="h-12 rounded-2xl pr-10"
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Pick a username"
                      value={username}
                    />
                    {usernameIndicator}
                  </div>
                  {usernameState === 'invalid' ? (
                    <p className="mt-2 text-xs text-rose-500">
                      Use 3-20 letters, numbers, or underscores.
                    </p>
                  ) : null}
                  {usernameState === 'taken' ? (
                    <p className="mt-2 text-xs text-rose-500">Username already taken.</p>
                  ) : null}
                  {usernameState === 'available' ? (
                    <p className="mt-2 text-xs text-emerald-600">Username is available.</p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
                <Input
                  className="h-12 rounded-2xl"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
                <Input
                  className="h-12 rounded-2xl"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                  type="password"
                  value={password}
                />
              </div>

              <Button
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-base text-white hover:from-amber-600 hover:to-orange-600"
                disabled={isSubmitting || isLoading || !isFormValid()}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === 'login' ? 'Login' : 'Sign Up'}
              </Button>

              {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            </div>

            <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <div className="h-px flex-1 bg-border/80" />
              <span>or</span>
              <div className="h-px flex-1 bg-border/80" />
            </div>

            <Button
              className="mt-6 h-12 w-full rounded-2xl bg-[#111827] text-base text-white hover:bg-[#0f172a]"
              disabled={isLoading || isSubmitting}
              onClick={onContinueWithGoogle}
            >
              <svg aria-hidden="true" className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#fff"
                  d="M21.6 12.23c0-.7-.06-1.37-.18-2.01H12v3.81h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.98-4.3 2.98-7.32Z"
                />
                <path
                  fill="#fff"
                  fillOpacity=".82"
                  d="M12 22c2.7 0 4.97-.9 6.63-2.45l-3.23-2.5c-.9.6-2.05.97-3.4.97-2.62 0-4.85-1.77-5.64-4.14H3.03v2.57A9.99 9.99 0 0 0 12 22Z"
                />
                <path
                  fill="#fff"
                  fillOpacity=".68"
                  d="M6.36 13.88A5.98 5.98 0 0 1 6.05 12c0-.65.11-1.28.31-1.88V7.55H3.03A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.03 4.45l3.33-2.57Z"
                />
                <path
                  fill="#fff"
                  fillOpacity=".9"
                  d="M12 5.98c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.96 2.98 14.7 2 12 2 8.11 2 4.76 4.23 3.03 7.55l3.33 2.57C7.15 7.75 9.38 5.98 12 5.98Z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-emerald-500" />
                <p className="text-sm font-medium">Account-backed data</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Your tasks live on the backend, not only in one browser.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <Sparkles className="mb-3 h-5 w-5 text-sky-500" />
                <p className="text-sm font-medium">A calmer workflow</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Priorities, reminders, and premium controls in one focused space.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
