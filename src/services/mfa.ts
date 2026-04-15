import { apiPost } from './api';

export interface MFASetupResponse {
  qrCodeDataUrl: string;
  secret: string;
}

export interface MFAVerifyResponse {
  ok?: boolean;
  verified?: boolean;
}

export function setupMFA() {
  return apiPost<MFASetupResponse>('/api/mfa/setup');
}

export function enableMFA(token: string) {
  return apiPost<MFAVerifyResponse>('/api/mfa/enable', { token });
}

export function verifyMFA(token: string) {
  return apiPost<MFAVerifyResponse>('/api/mfa/verify', { token });
}

export function disableMFA(token: string) {
  return apiPost<MFAVerifyResponse>('/api/mfa/disable', { token });
}
