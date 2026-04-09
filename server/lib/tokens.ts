import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64');
}

export function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number
) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(body));
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`;
}

export function verifyJwt(token: string, secret: string) {
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  if (!headerPart || !payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${headerPart}.${payloadPart}`)
    .digest();
  const actualSignature = fromBase64Url(signaturePart);

  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  const payload = JSON.parse(fromBase64Url(payloadPart).toString('utf8')) as {
    exp?: number;
    [key: string]: unknown;
  };

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function createOpaqueToken() {
  return toBase64Url(randomBytes(48));
}

export function hashToken(token: string, secret: string) {
  return createHmac('sha256', secret).update(token).digest('hex');
}

export function createCodeVerifier() {
  return toBase64Url(randomBytes(64));
}

export function createCodeChallenge(verifier: string) {
  return toBase64Url(
    createHash('sha256')
      .update(verifier)
      .digest()
  );
}
