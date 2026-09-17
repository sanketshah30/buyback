import { api } from './api';
import type { ResolvedQuestionnaireQuestion } from '../types/api';

export interface ResolveQuestionnaireResponse {
  productCategoryId: number;
  brandId: number;
  partnerId: number | null;
  questions: ResolvedQuestionnaireQuestion[];
}

// POST + JSON body, never GET + query string - see server/README.md.
export const questionnaireConfigApi = {
  resolve: (productCategoryId: number, brandId: number, partnerId?: number, language = 'en') =>
    api.post<ResolveQuestionnaireResponse>('/api/questionnaire-config/resolve', { productCategoryId, brandId, partnerId, language }),
};
