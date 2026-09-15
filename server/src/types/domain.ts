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

/**
 * Table: users
 * The same User row represents both self-service buyback customers (who
 * only ever have `mobile` + `name` set, from OTP login) and partner/vendor
 * staff (promoters, partner admins, vendor admins, ...) who are additionally
 * onboarded with `username`/`email` and assigned to a location. Both kinds
 * authenticate through the same mobile+OTP flow - see auth.service.ts.
 * FK: partnerLocationId -> partner_locations.id (a user's *current* location;
 * changes are tracked in `UserLocationHistory` below).
 */
export interface User extends BaseEntity {
  mobile: string;
  name?: string;
  username?: string;
  email?: string;
  partnerLocationId?: string;
}

export type PartnerType = 'vendor' | 'retailer';

/**
 * Table: partners
 * The business entity on either side of a buyback: a "retailer" is a
 * customer-facing purchase partner (e.g. a BestBuy storefront brand) and a
 * "vendor" is who collected devices are sold on to (e.g. a refurbisher).
 */
export interface Partner extends BaseEntity {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  partnerType: PartnerType;
  /** External/business identifier (e.g. merchant code, tax/registration ID) - unique among active partners. */
  uniqueIdentifier: string;
}

/**
 * Table: partner_locations
 * An individual physical location of a partner (e.g. "BestBuy New York").
 * FK: partnerId -> partners.id. Many locations can belong to one partner;
 * each location belongs to exactly one partner.
 */
export interface PartnerLocation extends BaseEntity {
  partnerId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  /** External/business identifier for this location - unique among active locations. */
  uniqueIdentifier: string;
}

/**
 * Table: roles
 * Master list of roles a user can hold (Partner Admin, Promoter, Vendor
 * Admin, ...). `rights` is a structured list of permission-key strings
 * (e.g. "manage_locations", "view_reports") rather than free text, so
 * authorization checks can be built against it later.
 */
export interface Role extends BaseEntity {
  name: string;
  rights: string[];
}

/**
 * Table: user_roles
 * Many-to-many mapping - one user can hold multiple roles.
 * FKs: userId -> users.id, roleId -> roles.id
 */
export interface UserRole extends BaseEntity {
  userId: string;
  roleId: string;
}

/**
 * Table: user_location_history
 * Every time a user's current location (users.partnerLocationId) changes,
 * an entry is recorded here - append-only audit trail, never mutated.
 * FKs: userId -> users.id, fromPartnerLocationId/toPartnerLocationId -> partner_locations.id
 */
export interface UserLocationHistory extends BaseEntity {
  userId: string;
  fromPartnerLocationId?: string;
  toPartnerLocationId?: string;
  changedByUserId?: string;
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
