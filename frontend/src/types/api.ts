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

// No price fields here - pricing now lives entirely in the vendor pricing
// module (server-side sku_pricing table), since the same product/SKU is
// priced differently by every vendor.
export interface Product extends BaseEntity {
  categoryId: number;
  brandId: number;
  name: string;
}

export interface Sku extends BaseEntity {
  productId: number;
  code: string;
  label: string;
}

export interface SkuAlias extends BaseEntity {
  skuId: number;
  partnerId: string;
  partnerSkuName: string;
}

export type QuestionType = 'single-choice' | 'multi-choice';

/** The resolved, per-(category, brand, partner) questionnaire - see POST /api/questionnaire-config/resolve. */
export interface ResolvedQuestionnaireQuestion {
  questionId: number;
  type: QuestionType;
  sequence: number;
  text: string;
  answers: { questionAnswerId: number; answerId: number; code: string; text: string }[];
}

export type AssessmentMethod = 'questionnaire' | 'image' | 'video';

/** `questionAnswerIds` reference `ResolvedQuestionnaireQuestion.answers[].questionAnswerId`. */
export interface QuestionnaireAnswer {
  questionId: number;
  questionAnswerIds: number[];
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
  | 'completed'
  | 'cancelled';

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
  referenceId?: string;
  userId: number;
  status: BuybackStatus;
  requestStatusId?: number;
  partnerLocationId?: number;
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
  /** The customer-facing value - equal to customerValue below. */
  maxValue?: number;
  allocatedVendorId?: number;
  retailerValue?: number;
  customerValue?: number;
  vendorPayable?: number;
  withDiagnosis?: boolean;
  diagnosis?: DiagnosisState;
  finalValue?: number;
  customer?: CustomerInfo;
  customerOtp?: { requestId: string; verified: boolean };
  documentProofUrl?: string;
  productImageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  receiptUrl?: string;
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
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Admin onboarding portal entities (mirrors server/src/types/domain.ts)
// ---------------------------------------------------------------------------

export type PartnerType = 'vendor' | 'retailer';

export interface Partner extends BaseEntity {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  partnerType: PartnerType;
  uniqueIdentifier: string;
  email?: string;
}

export interface PartnerLocation extends BaseEntity {
  partnerId: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  uniqueIdentifier: string;
  email?: string;
}

/** Staff user as returned by the admin /api/users endpoints (the `User` type above is the slimmer login-session shape). */
export interface AdminUser extends BaseEntity {
  mobile: string;
  name?: string;
  username?: string;
  email?: string;
  partnerLocationId?: number;
}

export interface SkuPricing extends BaseEntity {
  vendorId: number;
  skuId: number;
  price: number;
  validFrom: string;
  validTo?: string;
  uploadedById: number;
}

export interface DepreciationConfig extends BaseEntity {
  productCategoryId: number;
  brandId: number;
  vendorId: number | null;
  validFrom: string;
  validTo?: string;
  uploadedById: number;
}

export type DepreciationType = 'percentage' | 'absolute';

export interface DepreciationMatrixEntry extends BaseEntity {
  depreciationConfigId: number;
  questionAnswerId: number;
  depreciationType: DepreciationType;
  depreciationValue: number;
}

export interface MasterQuestion extends BaseEntity {
  type: QuestionType;
  /** Prefer English translation from admin search/get. */
  text?: string;
}

export interface MasterAnswer extends BaseEntity {
  code: string;
  /** Prefer English translation from admin search/get. */
  text?: string;
}

export interface QuestionAnswerMapping extends BaseEntity {
  questionId: number;
  answerId: number;
  /** Present on admin search responses (prefer English translation). */
  questionText?: string;
  answerText?: string;
  answerCode?: string;
}

/**
 * Which Q&A options apply for a category (+ optional brand/partner) and in
 * what order. Null brand/partner = wildcard (applies to all).
 */
export interface QuestionnaireConfig extends BaseEntity {
  productCategoryId: number;
  brandId: number | null;
  partnerId: number | null;
  questionAnswerId: number;
  sequence: number;
}
