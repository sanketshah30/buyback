import { api } from './api';
import type { User } from '../types/api';

export interface RequestOtpResponse {
  requestId: string;
  expiresAt: string;
  devOtp?: string;
}

export interface VerifyLoginOtpResponse {
  purpose: 'login';
  token: string;
  user: User;
}

export const authApi = {
  requestOtp: (mobile: string) => api.post<RequestOtpResponse>('/api/auth/otp/request', { mobile }),
  verifyOtp: (requestId: string, otp: string) =>
    api.post<VerifyLoginOtpResponse>('/api/auth/otp/verify', { requestId, otp }),
};
