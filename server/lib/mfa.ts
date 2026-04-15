import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

function getMfaIssuer() {
  return process.env.MFA_ISSUER?.trim() || 'TaskDo';
}

export function generateMfaSecret(email: string) {
  const issuer = getMfaIssuer();
  const secret = speakeasy.generateSecret({
    issuer,
    length: 20,
    name: `${issuer}:${email}`,
  });

  if (!secret.base32 || !secret.otpauth_url) {
    throw new Error('Failed to generate MFA secret.');
  }

  return {
    base32: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

export async function generateMfaQrCode(otpauthUrl: string) {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyMfaToken(secret: string, token: string) {
  return speakeasy.totp.verify({
    encoding: 'base32',
    secret,
    token,
    window: 1,
  });
}
