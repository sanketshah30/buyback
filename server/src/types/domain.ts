/**
 * Every persisted catalog entity carries the standard audit columns
 * (`id`, `createdAt`, `updatedAt`, `isActive`) so this maps cleanly onto real
 * SQL tables later - `isActive` doubles as a soft-delete flag instead of
 * hard-deleting rows that historical buybacks may still reference.
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export type DeviceCategoryType = 'smartphone' | 'non-smartphone';

/** Table: product_categories */
export interface Category extends BaseEntity {
  name: string;
  type: DeviceCategoryType;
}

/**
 * Table: brands
 * Standalone - a brand (e.g. "Apple") is not scoped to a single category.
 * The category relationship lives on `Product` instead, so the same brand
 * row is reused across every category it sells in.
 */
export interface Brand extends BaseEntity {
  name: string;
}

/**
 * Table: products
 * FKs: categoryId -> product_categories.id, brandId -> brands.id
 */
export interface Product extends BaseEntity {
  categoryId: string;
  brandId: string;
  name: string;
  basePrice: number;
}

/**
 * Table: skus
 * FK: productId -> products.id
 */
export interface Sku extends BaseEntity {
  productId: string;
  code: string;
  label: string;
  priceModifier: number;
}

/**
 * Table: sku_aliases
 * Maps a reselling/trade-in partner's own SKU naming onto our canonical SKU,
 * so inbound partner feeds can be resolved without the partner needing to
 * know our internal SKU IDs.
 * FK: skuId -> skus.id
 */
export interface SkuAlias extends BaseEntity {
  skuId: string;
  partnerId: string;
  partnerSkuName: string;
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
  product?: Product;
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
  /** Failed verify attempts against this challenge - locked out after too many. */
  attempts: number;
}
