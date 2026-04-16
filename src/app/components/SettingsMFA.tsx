import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { disableMFA, enableMFA, setupMFA, verifyMFA, type MFASetupResponse } from '../../services/mfa';
import { CodeInput } from './CodeInput';
import { MFASetup } from './MFASetup';
import { Button } from './ui/button';

type MfaMode = 'idle' | 'setup' | 'verify' | 'disable';

export function SettingsMFA() {
  const { refreshSession, user } = useAuth();
  const [mode, setMode] = useState<MfaMode>('idle');
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [disableCode, setDisableCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const status = user?.mfaEnabled ? 'enabled' : 'disabled';
  const verifyToken = verifyCode.join('');
  const disableToken = disableCode.join('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const resetCode = (setter: (next: string[]) => void) => {
    setter(['', '', '', '', '', '']);
  };

  const handleStartSetup = async () => {
    clearMessages();
    setIsSettingUp(true);

    try {
      const response = await setupMFA();
      setSetupData(response);
      resetCode(setVerifyCode);
      resetCode(setDisableCode);
      setMode('setup');
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
      resetCode(setVerifyCode);
      resetCode(setDisableCode);
      setMode('idle');
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
      resetCode(setVerifyCode);
      setMode('idle');
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
      resetCode(setDisableCode);
      resetCode(setVerifyCode);
      setSetupData(null);
      setMode('idle');
      setSuccess('MFA has been disabled.');
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Unable to disable MFA.');
    } finally {
      setIsDisabling(false);
    }
  };

  const renderIdleState = () => {
    if (!user?.mfaEnabled) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm font-medium">Set up MFA</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by generating a QR code, then verify the first 6-digit code from your authenticator app.
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            disabled={isSettingUp}
            onClick={() => void handleStartSetup()}
          >
            {isSettingUp ? 'Preparing setup...' : 'Enable MFA'}
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={() => {
          clearMessages();
          resetCode(setVerifyCode);
          setMode('verify');
        }} variant="outline">
          Verify current code
        </Button>
        <Button onClick={() => {
          clearMessages();
          resetCode(setDisableCode);
          setMode('disable');
        }} variant="outline">
          Disable MFA
        </Button>
      </div>
    );
  };

  const renderVerifyState = () => (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <p className="text-sm font-medium">Verify a current code</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirm your authenticator app is working before you leave settings.
      </p>
      <div className="mt-4">
        <CodeInput
          disabled={isVerifying}
          onChange={(value) => setVerifyCode(Array.from({ length: 6 }, (_, index) => value[index] ?? ''))}
          value={verifyToken}
        />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button
          disabled={isVerifying || verifyToken.length !== 6}
          onClick={() => void handleVerify()}
          variant="outline"
        >
          Verify code
        </Button>
        <Button
          onClick={() => {
            resetCode(setVerifyCode);
            clearMessages();
            setMode('idle');
          }}
          variant="ghost"
        >
          Back
        </Button>
      </div>
    </div>
  );

  const renderDisableState = () => (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <p className="text-sm font-medium">Disable MFA</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter a valid 6-digit code from your authenticator app to turn MFA off.
      </p>
      <div className="mt-4">
        <CodeInput
          disabled={isDisabling}
          onChange={(value) => setDisableCode(Array.from({ length: 6 }, (_, index) => value[index] ?? ''))}
          value={disableToken}
        />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button
          disabled={isDisabling || disableToken.length !== 6}
          onClick={() => void handleDisable()}
          variant="outline"
        >
          Disable MFA
        </Button>
        <Button
          onClick={() => {
            resetCode(setDisableCode);
            clearMessages();
            setMode('idle');
          }}
          variant="ghost"
        >
          Back
        </Button>
      </div>
    </div>
  );

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

      {mode === 'setup' && setupData ? (
        <div className="mb-5">
          <MFASetup
            error={error}
            isSubmitting={isEnabling}
            onCancel={() => {
              setMode('idle');
              setSetupData(null);
              resetCode(setVerifyCode);
              resetCode(setDisableCode);
              clearMessages();
            }}
            onEnable={handleEnable}
            qrCodeDataUrl={setupData.qrCodeDataUrl}
            secret={setupData.secret}
          />
        </div>
      ) : null}

      {mode === 'idle' ? renderIdleState() : null}
      {mode === 'verify' ? renderVerifyState() : null}
      {mode === 'disable' ? renderDisableState() : null}

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
