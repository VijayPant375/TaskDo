import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { disableMFA, enableMFA, setupMFA, verifyMFA, type MFASetupResponse } from '../../services/mfa';
import { MFASetup } from './MFASetup';
import { Button } from './ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';

export function SettingsMFA() {
  const { refreshSession, user } = useAuth();
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const status = setupData ? 'disabled' : user?.mfaEnabled ? 'enabled' : 'disabled';

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleStartSetup = async () => {
    clearMessages();
    setIsSettingUp(true);

    try {
      const response = await setupMFA();
      setVerifyToken('');
      setDisableToken('');
      setSetupData(response);
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Unable to start MFA setup.');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleEnable = async (token: string) => {
    clearMessages();
    setIsEnabling(true);

    try {
      await enableMFA(token);
      await refreshSession();
      setSetupData(null);
      setVerifyToken('');
      setDisableToken('');
      setSuccess('MFA is now enabled for your account.');
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : 'Unable to enable MFA.');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleVerify = async () => {
    if (verifyToken.length !== 6) {
      return;
    }

    clearMessages();
    setIsVerifying(true);

    try {
      await verifyMFA(verifyToken);
      setVerifyToken('');
      setSuccess('Authenticator code verified successfully.');
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (disableToken.length !== 6) {
      return;
    }

    clearMessages();
    setIsDisabling(true);

    try {
      await disableMFA(disableToken);
      await refreshSession();
      setDisableToken('');
      setVerifyToken('');
      setSetupData(null);
      setSuccess('MFA has been disabled.');
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Unable to disable MFA.');
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <section className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Multi-factor authentication</h2>
            <span className="rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Protect your account with a 6-digit code from an authenticator app.
          </p>
        </div>
      </div>

      {setupData ? (
        <div className="mb-5">
          <MFASetup
            error={error}
            isSubmitting={isEnabling}
            onCancel={() => {
              setSetupData(null);
              clearMessages();
            }}
            onEnable={handleEnable}
            qrCodeDataUrl={setupData.qrCodeDataUrl}
            secret={setupData.secret}
          />
        </div>
      ) : null}

      {!setupData ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            disabled={isSettingUp || Boolean(user?.mfaEnabled)}
            onClick={() => void handleStartSetup()}
          >
            {isSettingUp ? 'Preparing setup...' : user?.mfaEnabled ? 'MFA is enabled' : 'Set up MFA'}
          </Button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">Verify a current code</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use this after setup to confirm your authenticator app is working.
          </p>
          <div className="mt-4">
            <InputOTP
              containerClassName="justify-start"
              maxLength={6}
              onChange={setVerifyToken}
              pattern="^[0-9]+$"
              value={verifyToken}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            className="mt-4"
            disabled={isVerifying || verifyToken.length !== 6 || !user?.mfaEnabled}
            onClick={() => void handleVerify()}
            variant="outline"
          >
            Verify code
          </Button>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">Disable MFA</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a valid code from your authenticator app to turn MFA off.
          </p>
          <div className="mt-4">
            <InputOTP
              containerClassName="justify-start"
              maxLength={6}
              onChange={setDisableToken}
              pattern="^[0-9]+$"
              value={disableToken}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            className="mt-4"
            disabled={isDisabling || disableToken.length !== 6 || !user?.mfaEnabled}
            onClick={() => void handleDisable()}
            variant="outline"
          >
            Disable MFA
          </Button>
        </div>
      </div>

      {!user?.mfaEnabled && !setupData ? (
        <p className="mt-4 text-sm text-muted-foreground">
          If you enable MFA again after disabling it, scan the newly generated QR code. Old authenticator entries will no longer work.
        </p>
      ) : null}

      {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}
      {error && !setupData ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
    </section>
  );
}
