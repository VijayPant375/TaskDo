import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { CodeInput } from './CodeInput';

interface MFASetupProps {
  error?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onEnable: (token: string) => Promise<void>;
  qrCodeDataUrl: string;
  secret: string;
}

export function MFASetup({
  error,
  isSubmitting = false,
  onCancel,
  onEnable,
  qrCodeDataUrl,
  secret,
}: MFASetupProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const token = code.join('');

  const handleChange = (val: string, i: number) => {
    const updated = [...code];
    updated[i] = val;
    setCode(updated);
  };
  const handlePaste = (val: string) => {
    setCode(Array.from({ length: 6 }, (_, index) => val[index] ?? ''));
  };

  const handleEnable = async () => {
    if (token.length !== 6 || isSubmitting) {
      return;
    }

    await onEnable(token);
  };

  return (
    <div className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Set up authenticator app</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan the QR code with Google Authenticator, 1Password, or another TOTP app, then enter the first 6-digit code to finish setup.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-3xl border bg-white p-4">
          <img alt="MFA QR code" className="mx-auto h-auto w-full max-w-[180px]" src={qrCodeDataUrl} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Manual secret
            </p>
            <p className="mt-2 break-all font-mono text-sm">{secret}</p>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">Authenticator code</p>
            <CodeInput autoFocus disabled={isSubmitting} onChange={handleChange} onPaste={handlePaste} value={code} />
          </div>

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              disabled={isSubmitting || token.length !== 6}
              onClick={() => void handleEnable()}
            >
              {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enable MFA
            </Button>
            <Button className="h-12 rounded-2xl" onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
