export type DeviceCategoryType = 'smartphone' | 'non-smartphone';

export interface Category {
  id: string;
  name: string;
  type: DeviceCategoryType;
}

export interface Brand {
  id: string;
  categoryId: string;
  name: string;
}

export interface Model {
  id: string;
  categoryId: string;
  brandId: string;
  name: string;
  basePrice: number;
}

export interface Sku {
  id: string;
  modelId: string;
  code: string;
  label: string;
  priceModifier: number;
}

export type QuestionType = 'single-choice' | 'multi-choice';

export interface QuestionOption {
  id: string;
  label: string;
  /** Percentage deduction applied to the running value when this option is chosen (0-100). Negative = bonus. */
  valueImpactPercent: number;
}

export interface Question {
  id: string;
  categoryId: string;
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
  id: string;
  displayId?: string;
  userId: string;
  status: BuybackStatus;
  category?: Category;
  brand?: Brand;
  model?: Model;
  sku?: Sku;
  identifier?: {
    type: 'imei' | 'serial';
    value: string;
  };
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
  customerOtp?: {
    requestId: string;
    verified: boolean;
  };
  documentProofUrl?: string;
  productImageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface User {
  id: string;
  mobile: string;
  name?: string;
  createdAt: string;
}

export interface OtpChallenge {
  requestId: string;
  mobile: string;
  code: string;
  purpose: 'login' | 'buyback-confirmation';
  buybackId?: string;
  expiresAt: string;
  verified: boolean;
}
