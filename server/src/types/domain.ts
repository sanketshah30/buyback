/**
 * Every persisted entity carries the standard audit columns (`id`,
 * `createdAt`, `updatedAt`, `isActive`) so this maps cleanly onto real SQL
 * tables later - `isActive` doubles as a soft-delete flag instead of
 * hard-deleting rows that other tables may still reference.
 *
 * `id` is a sequential integer (never a UUID) on every table, matching a
 * real SQL `INT AUTO_INCREMENT PRIMARY KEY` column - see
 * `src/utils/idGenerator.ts` for how new rows get their ID in this
 * in-memory mock, and `src/repositories/inMemory/db.ts` for the indexes
 * maintained alongside each table's primary Map.
 */
export interface BaseEntity {
  id: number;
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
 * Indexed on (categoryId, brandId) - the app always looks products up by
 * that pair when a user drills into a specific brand's lineup.
 *
 * No price column here - pricing lives entirely in `SkuPricing` now (see
 * the vendor pricing module below), since the same product/SKU is priced
 * differently by every vendor and changes over time. The catalog only
 * describes *what* a product/SKU is, never what it's worth.
 */
export interface Product extends BaseEntity {
  categoryId: number;
  brandId: number;
  name: string;
}

/**
 * Table: skus
 * FK: productId -> products.id (indexed - SKUs are always looked up per product)
 * No price column - see the `Product` doc comment above.
 */
export interface Sku extends BaseEntity {
  productId: number;
  code: string;
  label: string;
}

/**
 * Table: sku_aliases
 * Maps a reselling/trade-in partner's own SKU naming onto our canonical SKU,
 * so inbound partner feeds can be resolved without the partner needing to
 * know our internal SKU IDs. `partnerId` here is that external partner's own
 * identifier/code (e.g. "cashify") - not a FK into our `partners` table,
 * since a SKU-feed partner need not be one of our onboarded buyback partners.
 * FK: skuId -> skus.id (indexed)
 */
export interface SkuAlias extends BaseEntity {
  skuId: number;
  partnerId: string;
  partnerSkuName: string;
}

export type QuestionType = 'single-choice' | 'multi-choice';

export type AssessmentMethod = 'questionnaire' | 'image' | 'video';

/**
 * One answered question, in the live buyback flow's assessment step.
 * `questionId`/`questionAnswerIds` reference the normalized questionnaire
 * module (`MasterQuestion.id` / `QuestionAnswerMapping.id`) - the live flow
 * used to have its own hardcoded, string-keyed per-category questionnaire,
 * now replaced by resolving `POST /api/questionnaire-config/resolve` and
 * submitting back real `questionAnswerId`s, which is what lets the
 * depreciation module (`depreciation_matrix.questionAnswerId`) actually
 * match against a customer's answers.
 */
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

/**
 * Table: buyback_requests. FK: userId -> users.id (indexed - history is
 * always looked up per user).
 *
 * `status` (the original string enum) keeps tracking the live wizard's
 * granular UI-flow steps (draft, device_captured, ..., confirmed) - it
 * isn't replaced. `requestStatusId` is a separate, additive field: the
 * formal business-lifecycle status from `request_status_master`, only
 * ever set to one of that table's 12 rows, starting with "Request
 * Created" at registration and "Amount Calculated" once allocation
 * finishes (see `buybackEngine.service.ts`) - later phases will wire the
 * rest of the master list (diagnosis, logistics, payout) into it.
 */
export interface BuybackRequest {
  id: number;
  /** Human-facing {{YYYYMMDD}}-{{Count}} reference (e.g. "20260917-1") - generated at registration, distinct from the internal integer `id`. */
  referenceId?: string;
  userId: number;
  status: BuybackStatus;
  /** FK: request_status_master.id - set at registration ("Request Created") onward; undefined before that (still being locally drafted). */
  requestStatusId?: number;
  /** The registering promoter's own location at the time of registration - FK: partner_locations.id. */
  partnerLocationId?: number;
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
  /**
   * The customer-facing buyback value - **equal to `customerValue` below**,
   * kept as its own field since it's what the rest of the flow (diagnosis
   * adjustment, `finalValue`, every customer-facing screen) already reads
   * and adjusts. See buybackEngine.service.ts's allocate phase.
   */
  maxValue?: number;
  /** The vendor allocated the device, per the highest computed Retailer value - see buybackEngine.service.ts. FK: partners.id. */
  allocatedVendorId?: number;
  /** SKU pricing - total depreciation, for the allocated vendor. What the retail partner's side of the transaction is worth before their margin. */
  retailerValue?: number;
  /** retailerValue - partner margin. What's actually paid out to the customer - see `maxValue` above, which mirrors this. */
  customerValue?: number;
  /** retailerValue + vendor fee. What we owe the allocated vendor - only ever computed for the vendor that won allocation, never every candidate. */
  vendorPayable?: number;
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
 * changes are tracked in `UserLocationHistory` below). Indexed on `mobile`
 * (the OTP login lookup key) and on `partnerLocationId`.
 */
export interface User extends BaseEntity {
  mobile: string;
  name?: string;
  username?: string;
  email?: string;
  partnerLocationId?: number;
}

export type PartnerType = 'vendor' | 'retailer';

/**
 * Table: partners
 * The business entity on either side of a buyback: a "retailer" is a
 * customer-facing purchase partner (e.g. a BestBuy storefront brand) and a
 * "vendor" is who collected devices are sold on to (e.g. a refurbisher).
 * Indexed on `uniqueIdentifier` (enforced-unique business/merchant code).
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
 * FK: partnerId -> partners.id (indexed). Many locations can belong to one
 * partner; each location belongs to exactly one partner. Also indexed on
 * `uniqueIdentifier`.
 */
export interface PartnerLocation extends BaseEntity {
  partnerId: number;
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
 * FKs: userId -> users.id (indexed), roleId -> roles.id
 */
export interface UserRole extends BaseEntity {
  userId: number;
  roleId: number;
}

/**
 * Table: user_location_history
 * Every time a user's current location (users.partnerLocationId) changes,
 * an entry is recorded here - append-only audit trail, never mutated.
 * FKs: userId -> users.id (indexed), fromPartnerLocationId/toPartnerLocationId -> partner_locations.id
 */
export interface UserLocationHistory extends BaseEntity {
  userId: number;
  fromPartnerLocationId?: number;
  toPartnerLocationId?: number;
  changedByUserId?: number;
}

/**
 * ---------------------------------------------------------------------
 * Questionnaire configuration module
 * ---------------------------------------------------------------------
 * Named `Master*`/`*Mapping`/`QuestionnaireConfig` (rather than `Question`/
 * `QuestionnaireAnswer`) to avoid colliding with the existing hardcoded
 * per-category questionnaire types above, which the live buyback flow still
 * uses today - this module is additive/config-only for now and isn't wired
 * into the buyback flow or valuation engine yet (that integration, and
 * scoring, is a follow-up phase).
 *
 * Language is deliberately NOT baked into the base Question/Answer rows -
 * each is a language-agnostic "concept" with its display text supplied by
 * separate translation tables (QuestionTranslation/AnswerTranslation), so a
 * single Question-Answer mapping and a single category/brand/partner config
 * works across every language without duplicating rows per language.
 */

/** Table: questions */
export interface MasterQuestion extends BaseEntity {
  type: QuestionType;
}

/** Table: question_translations. FK: questionId -> questions.id (indexed). */
export interface QuestionTranslation extends BaseEntity {
  questionId: number;
  language: string;
  text: string;
}

/** Table: answers. `code` is a stable, language-independent key (e.g. "yes", "charger") for programmatic reference (e.g. by the future valuation engine). Indexed on `code`. */
export interface MasterAnswer extends BaseEntity {
  code: string;
}

/** Table: answer_translations. FK: answerId -> answers.id (indexed). */
export interface AnswerTranslation extends BaseEntity {
  answerId: number;
  language: string;
  text: string;
}

/**
 * Table: question_answer_mapping
 * A single row = "this Answer is a valid, selectable option for this Question".
 * FKs: questionId -> questions.id (indexed), answerId -> answers.id
 */
export interface QuestionAnswerMapping extends BaseEntity {
  questionId: number;
  answerId: number;
}

/**
 * Table: questionnaire_config
 * Determines which Question-Answer options apply for a given Product
 * Category (always required, exact match) + Brand + Partner, and in what
 * order (`sequence`) the underlying question appears.
 *
 * `brandId`/`partnerId` are `null` to mean "applies to all" (the spec's
 * "0" sentinel, adapted to `null` since these are real integer FKs and 0 is
 * not a reserved/invalid ID here). Resolution precedence (most to least
 * specific), all requiring an exact Category match: (1) exact brand + exact
 * partner, (2) wildcard brand + exact partner, (3) exact brand + wildcard
 * partner, (4) wildcard brand + wildcard partner. Partner-specificity
 * outranks brand-specificity when only one of the two is specific - see
 * `QuestionnaireConfigRepository.resolve()` in the repository layer.
 *
 * FKs: productCategoryId -> product_categories.id (required, indexed),
 * brandId -> brands.id (nullable), partnerId -> partners.id (nullable),
 * questionAnswerId -> question_answer_mapping.id. Indexed on
 * (productCategoryId, brandId, partnerId) as a composite, matching exactly
 * how `resolve()` queries it.
 */
export interface QuestionnaireConfig extends BaseEntity {
  productCategoryId: number;
  brandId: number | null;
  partnerId: number | null;
  questionAnswerId: number;
  sequence: number;
}

/**
 * Table: sessions
 * A row is created every time a user completes `login`-purpose OTP
 * verification, capturing that login/session event separately from the
 * short-lived `OtpChallenge` used to get there. The issued JWT is stored
 * here (indexed, see db.ts) so `requireAuth` can reject an otherwise
 * validly-signed token whose session has been revoked (logout) or expired -
 * something a bare stateless JWT can't support on its own.
 * FK: userId -> users.id (indexed).
 */
export interface Session extends BaseEntity {
  userId: number;
  token: string;
  expiresAt: string;
  revokedAt?: string;
}

/**
 * ---------------------------------------------------------------------
 * Vendor pricing module (inputs to the upcoming buyback valuation/vendor
 * selection engine)
 * ---------------------------------------------------------------------
 * "Vendor" is not a separate table - a vendor is simply a `Partner` row
 * with `partnerType: 'vendor'` (the same `partners` table already used for
 * retailer partners like BestBuy). These two tables let the future
 * calculation engine answer "given this retail partner and this device's
 * category/SKU, which vendor(s) could buy it, and at what price does each
 * vendor currently offer for that SKU" - multiple buyback values get
 * computed (one per eligible vendor) and the engine picks a winner.
 */

/**
 * Table: partner_category_vendor_mapping
 * Which vendor(s) a retail partner's specific *location* uses for buybacks
 * in a given product category - scoped to `partnerLocationId` rather than
 * `partnerId`, since two locations of the same partner (e.g. "BestBuy New
 * York" vs. "BestBuy Dallas") may route to different vendors. Deliberately
 * **not unique** on (partnerLocationId, productCategoryId) - a location can
 * have several eligible vendors per category, and the calculation engine
 * evaluates all of them before picking one.
 * FKs: partnerLocationId -> partner_locations.id, productCategoryId ->
 * product_categories.id, vendorId -> partners.id (the vendor). Indexed on
 * partnerLocationId, productCategoryId, vendorId, and the
 * (partnerLocationId, productCategoryId) pair together (the engine's main
 * lookup pattern).
 */
export interface PartnerCategoryVendorMapping extends BaseEntity {
  partnerLocationId: number;
  productCategoryId: number;
  vendorId: number;
}

/**
 * Table: sku_pricing
 * A vendor's buyback price for a specific SKU. This is the *only* source of
 * pricing in the whole app now - `Product`/`Sku` carry no price columns at
 * all, since the *same* SKU is priced differently by every vendor, and a
 * vendor's price for a SKU changes over time (`validFrom`/`validTo`).
 * FKs: vendorId -> partners.id (a `partnerType: 'vendor'` row - see module
 * doc comment above), skuId -> skus.id, uploadedById -> users.id. Indexed
 * on vendorId, skuId, and the (vendorId, skuId) pair together (the engine's
 * main lookup pattern, further filtered by validFrom/validTo in memory).
 */
export interface SkuPricing extends BaseEntity {
  vendorId: number;
  skuId: number;
  price: number;
  validFrom: string;
  /** Blank/undefined = open-ended - this is the vendor's current price for the SKU until a new row supersedes it. */
  validTo?: string;
  uploadedById: number;
}

/**
 * ---------------------------------------------------------------------
 * Depreciation module (another input to the upcoming valuation/vendor-
 * selection engine, alongside the vendor pricing module above)
 * ---------------------------------------------------------------------
 * Split into a header table (`depreciation_config`, one row per (category,
 * brand, vendor?, validity window) "set") and a detail table
 * (`depreciation_matrix`, one row per question-answer within that set) so
 * uploading a full config batch - e.g. 40 questions x 8 brands = 320
 * question-answer rows - doesn't repeat the same category/brand/vendor/
 * validity columns 40 times over. This is the same normalization
 * relationship as an order and its line items.
 */

/**
 * Table: depreciation_config
 * FKs: productCategoryId -> product_categories.id (required, exact match),
 * brandId -> brands.id (required, exact match), vendorId -> partners.id
 * (a vendor-type Partner row, nullable = applies to all vendors),
 * uploadedById -> users.id.
 *
 * Uploading a new set for the exact same (productCategoryId, brandId,
 * vendorId) triple doesn't create a conflicting duplicate - it versions
 * the existing one: the currently-open row (`validTo` blank) has its
 * `validTo` set to the new upload's timestamp, and a new row is inserted
 * with `validFrom` = that same timestamp and `validTo` blank. History is
 * preserved (old rows keep their now-closed validity window) rather than
 * being overwritten. See `depreciationService.upload()`.
 */
export interface DepreciationConfig extends BaseEntity {
  productCategoryId: number;
  brandId: number;
  vendorId: number | null;
  validFrom: string;
  /** Blank/undefined = open-ended - the currently-active set for this (category, brand, vendor) triple. */
  validTo?: string;
  uploadedById: number;
}

/**
 * Table: depreciation_matrix
 * One row per question-answer within a `depreciation_config` set - the
 * actual deduction to apply when that answer was given.
 * FKs: depreciationConfigId -> depreciation_config.id, questionAnswerId ->
 * question_answer_mapping.id. `questionAnswerId` is unique per
 * `depreciationConfigId` (one deduction per question-answer per set).
 */
export interface DepreciationMatrixEntry extends BaseEntity {
  depreciationConfigId: number;
  questionAnswerId: number;
  depreciationType: 'percentage' | 'absolute';
  depreciationValue: number;
}

/**
 * ---------------------------------------------------------------------
 * Buyback request creation engine (register / calculate / allocate)
 * ---------------------------------------------------------------------
 * Three tables supporting the three phases of turning a captured device
 * assessment into an allocated buyback value:
 *   1. register - generates `BuybackRequest.referenceId`, stamps
 *      `partnerLocationId`, and sets `requestStatusId` to "Request Created".
 *   2. calculate - for every vendor mapped to that (partnerLocationId,
 *      category) via `partner_category_vendor_mapping`, computes a
 *      candidate buyback value (`sku_pricing` price minus the matched
 *      `depreciation_matrix` deductions) and logs every candidate in
 *      `buyback_vendor_calculation_log`.
 *   3. allocate - picks the candidate with the highest `buybackValue`
 *      (ties broken by lowest `vendorId`), writes it back onto the parent
 *      `BuybackRequest` (`maxValue`, `allocatedVendorId`), and advances
 *      `requestStatusId` to "Amount Calculated".
 * See `buybackEngine.service.ts` for the implementation.
 */

/**
 * Table: request_status_master
 * The full formal buyback lifecycle, in order (`sequence`). Only
 * "Request Created" and "Amount Calculated" are wired into the live flow
 * so far (registration/allocation) - the rest of the list exists for the
 * upcoming diagnosis/logistics/payout phases.
 */
export interface RequestStatusMaster extends BaseEntity {
  name: string;
  sequence: number;
}

/**
 * Table: buyback_status_history
 * Append-only log of every `requestStatusId` transition a buyback request
 * goes through - never mutated, only appended to.
 * FKs: buybackRequestId -> buyback_requests.id (indexed), requestStatusId
 * -> request_status_master.id, changedByUserId -> users.id.
 */
export interface BuybackStatusHistory extends BaseEntity {
  buybackRequestId: number;
  requestStatusId: number;
  changedByUserId?: number;
}

/**
 * Table: buyback_vendor_calculation_log
 * One row per (buyback request, evaluated vendor) produced by the
 * calculate phase - every candidate is recorded, not just the winner, so
 * the allocation decision (and the numbers behind it) stays fully
 * auditable. `depreciationConfigId` is nullable since a vendor may have no
 * depreciation set configured for this category/brand at all, in which
 * case its deduction is treated as zero.
 * FKs: buybackRequestId -> buyback_requests.id (indexed), vendorId ->
 * partners.id, skuPricingId -> sku_pricing.id, depreciationConfigId ->
 * depreciation_config.id (nullable).
 */
export interface BuybackVendorCalculationLog extends BaseEntity {
  buybackRequestId: number;
  vendorId: number;
  skuPricingId: number;
  depreciationConfigId: number | null;
  /** The vendor's raw sku_pricing price, before any depreciation. */
  skuPrice: number;
  /** Sum of every matched depreciation_matrix deduction (percentage entries converted to an amount off skuPrice, absolute entries taken directly). */
  totalDepreciationAmount: number;
  /** max(0, skuPrice - totalDepreciationAmount) - this vendor's candidate buyback value. */
  buybackValue: number;
}

/**
 * ---------------------------------------------------------------------
 * Partner margin & vendor fee configs (the final two inputs to the
 * calculation engine's allocate phase)
 * ---------------------------------------------------------------------
 */

/**
 * Table: partner_margin_config
 * The retail partner's commission, as a percentage deducted from the
 * "Retailer" buyback value to arrive at the "Customer" value actually paid
 * out to the walk-in customer. FKs: partnerId -> partners.id,
 * partnerLocationId -> partner_locations.id, **but `0` is a literal,
 * non-nullable sentinel meaning "applies to every location of this
 * partner"** (a deliberate departure from this codebase's usual `null`
 * wildcard convention, since it was specified that way), productCategoryId
 * -> product_categories.id (always required, exact match). An exact
 * location match takes precedence over a location=0 wildcard row for the
 * same partner+category - see `PartnerMarginConfigRepository.resolve()`.
 * Indexed on the (partnerId, partnerLocationId, productCategoryId)
 * composite - the resolve lookup's exact key.
 */
export interface PartnerMarginConfig extends BaseEntity {
  partnerId: number;
  /** `0` = applies to all of this partner's locations. */
  partnerLocationId: number;
  productCategoryId: number;
  marginPercent: number;
}

/**
 * Table: vendor_fee_config
 * A vendor's fixed operating fee, in absolute currency, added on top of
 * the "Retailer" buyback value to arrive at what we actually pay that
 * vendor ("Vendor payable"). FKs: vendorId -> partners.id (vendor),
 * productCategoryId -> product_categories.id (both always required, exact
 * match - no wildcard). Indexed on the (vendorId, productCategoryId)
 * composite.
 */
export interface VendorFeeConfig extends BaseEntity {
  vendorId: number;
  productCategoryId: number;
  feeAmount: number;
}

export interface OtpChallenge {
  /**
   * Opaque, unguessable request handle handed to the client - deliberately
   * kept as a random string token (like a session nonce) rather than a
   * sequential integer, since unlike every table above this is never
   * joined/FK'd from another table and a predictable ID here would let a
   * client enumerate other users' in-flight OTP challenges.
   */
  requestId: string;
  mobile: string;
  code: string;
  purpose: 'login' | 'buyback-confirmation';
  buybackId?: number;
  expiresAt: string;
  verified: boolean;
  /** Failed verify attempts against this challenge - locked out after too many. */
  attempts: number;
}
