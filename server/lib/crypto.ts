import { randomBytes } from 'node:crypto';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const encryptionKeyCache = new Map<string, Uint8Array>();

function getEncryptionKeyValue() {
  const key = process.env.ENCRYPTION_KEY?.trim();

  if (!key) {
    throw new Error('ENCRYPTION_KEY is not configured.');
  }

  return key;
}

function getEncryptionKeyBytes() {
  const keyValue = getEncryptionKeyValue();
  const cached = encryptionKeyCache.get(keyValue);

  if (cached) {
    return cached;
  }

  const key = Buffer.from(keyValue, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }

  const normalizedKey = new Uint8Array(key);
  encryptionKeyCache.set(keyValue, normalizedKey);
  return normalizedKey;
}

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(value: string) {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

export function encrypt(value: string) {
  const nonce = randomBytes(12);
  const cipher = chacha20poly1305(getEncryptionKeyBytes(), nonce);
  const encrypted = cipher.encrypt(textEncoder.encode(value));

  return {
    encrypted: toBase64(encrypted),
    nonce: toBase64(nonce),
  };
}

export function decrypt(encrypted: string, nonce: string) {
  const cipher = chacha20poly1305(getEncryptionKeyBytes(), fromBase64(nonce));
  const decrypted = cipher.decrypt(fromBase64(encrypted));
  return textDecoder.decode(decrypted);
}
