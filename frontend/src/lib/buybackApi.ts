import { api } from './api';
import type { BuybackRequest, QuestionnaireAnswer } from '../types/api';

export interface CustomerOtpResponse {
  request: BuybackRequest;
  otpRequestId: string;
  devOtp?: string;
}

export const buybackApi = {
  list: () => api.get<BuybackRequest[]>('/api/buyback'),
  get: (id: string) => api.get<BuybackRequest>(`/api/buyback/${id}`),
  create: (categoryId: number, brandId: number) =>
    api.post<BuybackRequest>('/api/buyback', { categoryId, brandId }),
  setDevice: (id: string, value: string) =>
    api.patch<BuybackRequest>(`/api/buyback/${id}/device`, { value }),
  setProduct: (id: string, productId: number, skuId: number) =>
    api.patch<BuybackRequest>(`/api/buyback/${id}/product`, { productId, skuId }),
  submitQuestionnaire: (id: string, answers: QuestionnaireAnswer[]) =>
    api.post<BuybackRequest>(`/api/buyback/${id}/assessment/questionnaire`, { answers }),
  submitImages: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return api.upload<BuybackRequest>(`/api/buyback/${id}/assessment/images`, form);
  },
  submitVideo: (id: string, file: File) => {
    const form = new FormData();
    form.append('video', file);
    return api.upload<BuybackRequest>(`/api/buyback/${id}/assessment/video`, form);
  },
  runValuation: (id: string) => api.post<BuybackRequest>(`/api/buyback/${id}/valuation`),
  initiateDiagnosis: (id: string) => api.post<BuybackRequest>(`/api/buyback/${id}/diagnosis/initiate`),
  pollDiagnosis: (id: string) => api.get<BuybackRequest>(`/api/buyback/${id}/diagnosis/status`),
  finalizeWithoutDiagnosis: (id: string) =>
    api.post<BuybackRequest>(`/api/buyback/${id}/finalize-value`, { withDiagnosis: false }),
  submitCustomer: (id: string, name: string, email: string, mobile: string) =>
    api.post<CustomerOtpResponse>(`/api/buyback/${id}/customer`, { name, email, mobile }),
  resendCustomerOtp: (id: string, channel: 'sms' | 'call' = 'sms') =>
    api.post<CustomerOtpResponse>(`/api/buyback/${id}/customer/resend-otp`, { channel }),
  verifyCustomerOtp: (id: string, otp: string) =>
    api.post<BuybackRequest>(`/api/buyback/${id}/customer/verify-otp`, { otp }),
  uploadDocument: (id: string, file: File) => {
    const form = new FormData();
    form.append('document', file);
    return api.upload<BuybackRequest>(`/api/buyback/${id}/documents`, form);
  },
  uploadProductImages: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return api.upload<BuybackRequest>(`/api/buyback/${id}/product-images`, form);
  },
  confirm: (id: string) => api.post<BuybackRequest>(`/api/buyback/${id}/confirm`),
};
