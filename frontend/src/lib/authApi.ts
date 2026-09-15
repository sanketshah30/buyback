import { api } from './api';
import type { Role, User } from '../types/api';

export interface RequestOtpResponse {
  requestId: string;
  expiresAt: string;
  devOtp?: string;
}

export interface VerifyLoginOtpResponse {
  purpose: 'login';
  token: string;
  user: User;
  /** Resolved server-side from the user's partnerLocationId at login - see server/src/services/auth.service.ts. */
  partnerId: number | null;
  partnerLocationId: number | null;
  roles: Role[];
}

export const authApi = {
  requestOtp: (mobile: string) => api.post<RequestOtpResponse>('/api/auth/otp/request', { mobile }),
  verifyOtp: (requestId: string, otp: string) =>
    api.post<VerifyLoginOtpResponse>('/api/auth/otp/verify', { requestId, otp }),
  logout: () => api.post<void>('/api/auth/logout'),
};
