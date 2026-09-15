// Mirrors server/src/types/domain.ts. Kept as a plain duplicate for this MVP
// since frontend and server are independently deployable packages; consider
// extracting a shared `packages/types` workspace once the API stabilizes.

export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export type DeviceCategoryType = 'smartphone' | 'non-smartphone';

export interface Category extends BaseEntity {
  name: string;
  type: DeviceCategoryType;
}

/** Standalone - not scoped to a category. See server/src/types/domain.ts. */
export interface Brand extends BaseEntity {
  name: string;
}

export interface Product extends BaseEntity {
  categoryId: number;
  brandId: number;
  name: string;
  basePrice: number;
}

export interface Sku extends BaseEntity {
  productId: number;
  code: string;
  label: string;
  priceModifier: number;
}

export interface SkuAlias extends BaseEntity {
  skuId: number;
  partnerId: string;
  partnerSkuName: string;
}

export type QuestionType = 'single-choice' | 'multi-choice';

export interface QuestionOption {
  id: string;
  label: string;
  valueImpactPercent: number;
}

export interface Question {
  id: string;
  categoryId: number;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
}

export type AssessmentMethod = 'questionnaire' | 'image' | 'video';

export interface QuestionnaireAnswer {
  questionId: string;
  optionIds: string[];
}

export type BuybackStatus =
  | 'draft'
  | 'device_captured'
  | 'product_selected'
  | 'assessment_completed'
  | 'valuation_ready'
  | 'diagnosis_pending'
  | 'diagnosis_completed'
  | 'value_finalized'
  | 'customer_info_pending'
  | 'otp_verified'
  | 'document_uploaded'
  | 'product_images_uploaded'
  | 'confirmed';

export type DiagnosisStatus = 'not_started' | 'pending' | 'in_progress' | 'completed';

export interface DiagnosisState {
  diagnosisId: string;
  qrToken: string;
  status: DiagnosisStatus;
  pollCount: number;
  requiredPolls: number;
  resultAdjustmentPercent?: number;
  findings?: string[];
  completedAt?: string;
}

export interface AiAssessmentResult {
  method: 'image' | 'video';
  mediaCount: number;
  generatedAnswers: QuestionnaireAnswer[];
  summary: string;
  confidence: number;
}

export interface CustomerInfo {
  name: string;
  email: string;
  mobile: string;
}

export interface BuybackRequest {
  id: number;
  displayId?: string;
  userId: number;
  status: BuybackStatus;
  category?: Category;
  brand?: Brand;
  product?: Product;
  sku?: Sku;
  identifier?: { type: 'imei' | 'serial'; value: string };
  assessmentMethod?: AssessmentMethod;
  questionnaireAnswers?: QuestionnaireAnswer[];
  aiAssessment?: AiAssessmentResult;
  assessmentImageUrls?: string[];
  assessmentVideoUrl?: string;
  maxValue?: number;
  withDiagnosis?: boolean;
  diagnosis?: DiagnosisState;
  finalValue?: number;
  customer?: CustomerInfo;
  customerOtp?: { requestId: string; verified: boolean };
  documentProofUrl?: string;
  productImageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface User {
  id: number;
  mobile: string;
  name?: string;
  createdAt: string;
}

export interface Role {
  id: number;
  name: string;
  rights: string[];
}
