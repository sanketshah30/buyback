import { api } from './api';
import { uploadBuybackFile, uploadBuybackFiles, type UploadProgress } from './blobUpload';
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
  submitImages: async (
    id: string,
    files: File[],
    onFileProgress?: (index: number, label: string, progress: UploadProgress | { error: string }) => void,
  ) => {
    const pathnames = await uploadBuybackFiles(id, 'assessment', files, onFileProgress);
    return api.post<BuybackRequest>(`/api/buyback/${id}/assessment/images`, { pathnames });
  },
  submitVideo: async (id: string, file: File, onProgress?: (progress: UploadProgress) => void) => {
    const pathname = await uploadBuybackFile(id, 'video', file, onProgress);
    return api.post<BuybackRequest>(`/api/buyback/${id}/assessment/video`, { pathname });
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
  uploadDocument: async (id: string, file: File, onProgress?: (progress: UploadProgress) => void) => {
    const pathname = await uploadBuybackFile(id, 'document', file, onProgress);
    return api.post<BuybackRequest>(`/api/buyback/${id}/documents`, { pathname });
  },
  uploadProductImages: async (
    id: string,
    files: File[],
    onFileProgress?: (index: number, label: string, progress: UploadProgress | { error: string }) => void,
  ) => {
    const pathnames = await uploadBuybackFiles(id, 'product', files, onFileProgress);
    return api.post<BuybackRequest>(`/api/buyback/${id}/product-images`, { pathnames });
  },
  confirm: (id: string) => api.post<BuybackRequest>(`/api/buyback/${id}/confirm`),
  cancel: (id: string) => api.post<BuybackRequest>(`/api/buyback/${id}/cancel`),
};
