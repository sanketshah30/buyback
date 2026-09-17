import {
  AnswerTranslation,
  Brand,
  BuybackRequest,
  BuybackStatusHistory,
  BuybackVendorCalculationLog,
  Category,
  DepreciationConfig,
  DepreciationMatrixEntry,
  MasterAnswer,
  MasterQuestion,
  OtpChallenge,
  Partner,
  PartnerLocation,
  PartnerCategoryVendorMapping,
  PartnerType,
  Product,
  QuestionAnswerMapping,
  QuestionTranslation,
  QuestionnaireConfig,
  RequestStatusMaster,
  Role,
  Session,
  Sku,
  SkuAlias,
  SkuPricing,
  User,
  UserLocationHistory,
  UserRole,
} from '../types/domain';

/**
 * Repository contracts for the buyback platform's data layer.
 *
 * The MVP ships an in-memory implementation (`./inMemory`) so the whole
 * product flow can be exercised with mock data. To move to MySQL later,
 * implement each interface against `mysql2`/an ORM and swap the wiring in
 * `src/repositories/index.ts` - nothing above the repository layer needs to
 * change.
 */

export interface UserRepository {
  findByMobile(mobile: string): Promise<User | undefined>;
  findById(id: number): Promise<User | undefined>;
  /** `extra` lets partner/vendor onboarding set username/email/location up front; plain OTP self-signup only ever passes `mobile`. */
  create(mobile: string, extra?: Partial<Pick<User, 'username' | 'email' | 'name' | 'partnerLocationId'>>): Promise<User>;
  update(id: number, patch: Partial<User>): Promise<User>;
  listByLocation(partnerLocationId: number): Promise<User[]>;
  list(filter?: { isActive?: boolean }): Promise<User[]>;
  findByUsername(username: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
}

export interface OtpRepository {
  create(challenge: OtpChallenge): Promise<OtpChallenge>;
  findById(requestId: string): Promise<OtpChallenge | undefined>;
  markVerified(requestId: string): Promise<void>;
  recordFailedAttempt(requestId: string): Promise<OtpChallenge | undefined>;
}

export interface SessionRepository {
  create(session: Session): Promise<Session>;
  findByToken(token: string): Promise<Session | undefined>;
  revoke(token: string): Promise<void>;
  listByUser(userId: number): Promise<Session[]>;
}

export interface CatalogRepository {
  listCategories(): Promise<Category[]>;
  /** Brands are standalone (see types/domain.ts); this derives the distinct
   * brands that have at least one active product listed under this category -
   * the equivalent of `SELECT DISTINCT b.* FROM brands b JOIN products p ON
   * p.brand_id = b.id WHERE p.category_id = ? AND p.is_active`. */
  listBrandsByCategory(categoryId: number): Promise<Brand[]>;
  listProducts(categoryId: number, brandId: number): Promise<Product[]>;
  listSkus(productId: number): Promise<Sku[]>;
  listSkuAliases(skuId: number): Promise<SkuAlias[]>;
  getCategory(categoryId: number): Promise<Category | undefined>;
  getBrand(brandId: number): Promise<Brand | undefined>;
  getProduct(productId: number): Promise<Product | undefined>;
  getSku(skuId: number): Promise<Sku | undefined>;
}

export interface BuybackRepository {
  create(request: BuybackRequest): Promise<BuybackRequest>;
  findById(id: number): Promise<BuybackRequest | undefined>;
  update(id: number, patch: Partial<BuybackRequest>): Promise<BuybackRequest>;
  listByUser(userId: number): Promise<BuybackRequest[]>;
  nextDailySequence(dateKey: string): Promise<number>;
}

export interface PartnerRepository {
  create(partner: Partner): Promise<Partner>;
  update(id: number, patch: Partial<Partner>): Promise<Partner>;
  findById(id: number): Promise<Partner | undefined>;
  findByUniqueIdentifier(uniqueIdentifier: string): Promise<Partner | undefined>;
  list(filter?: { isActive?: boolean; partnerType?: PartnerType }): Promise<Partner[]>;
}

export interface PartnerLocationRepository {
  create(location: PartnerLocation): Promise<PartnerLocation>;
  update(id: number, patch: Partial<PartnerLocation>): Promise<PartnerLocation>;
  findById(id: number): Promise<PartnerLocation | undefined>;
  findByUniqueIdentifier(uniqueIdentifier: string): Promise<PartnerLocation | undefined>;
  listByPartner(partnerId: number): Promise<PartnerLocation[]>;
  list(filter?: { isActive?: boolean }): Promise<PartnerLocation[]>;
}

export interface RoleRepository {
  create(role: Role): Promise<Role>;
  update(id: number, patch: Partial<Role>): Promise<Role>;
  findById(id: number): Promise<Role | undefined>;
  list(filter?: { isActive?: boolean }): Promise<Role[]>;
}

export interface UserRoleRepository {
  assign(userRole: UserRole): Promise<UserRole>;
  /** Soft-revokes the assignment (isActive=false) rather than deleting the row, preserving the audit trail. */
  revoke(userId: number, roleId: number): Promise<void>;
  listByUser(userId: number): Promise<UserRole[]>;
  findActive(userId: number, roleId: number): Promise<UserRole | undefined>;
}

export interface UserLocationHistoryRepository {
  record(entry: UserLocationHistory): Promise<UserLocationHistory>;
  listByUser(userId: number): Promise<UserLocationHistory[]>;
}

export interface MasterQuestionRepository {
  create(question: MasterQuestion): Promise<MasterQuestion>;
  update(id: number, patch: Partial<MasterQuestion>): Promise<MasterQuestion>;
  findById(id: number): Promise<MasterQuestion | undefined>;
  list(filter?: { isActive?: boolean }): Promise<MasterQuestion[]>;
}

export interface QuestionTranslationRepository {
  upsert(translation: QuestionTranslation): Promise<QuestionTranslation>;
  listByQuestion(questionId: number): Promise<QuestionTranslation[]>;
  find(questionId: number, language: string): Promise<QuestionTranslation | undefined>;
}

export interface MasterAnswerRepository {
  create(answer: MasterAnswer): Promise<MasterAnswer>;
  update(id: number, patch: Partial<MasterAnswer>): Promise<MasterAnswer>;
  findById(id: number): Promise<MasterAnswer | undefined>;
  findByCode(code: string): Promise<MasterAnswer | undefined>;
  list(filter?: { isActive?: boolean }): Promise<MasterAnswer[]>;
}

export interface AnswerTranslationRepository {
  upsert(translation: AnswerTranslation): Promise<AnswerTranslation>;
  listByAnswer(answerId: number): Promise<AnswerTranslation[]>;
  find(answerId: number, language: string): Promise<AnswerTranslation | undefined>;
}

export interface QuestionAnswerMappingRepository {
  create(mapping: QuestionAnswerMapping): Promise<QuestionAnswerMapping>;
  update(id: number, patch: Partial<QuestionAnswerMapping>): Promise<QuestionAnswerMapping>;
  findById(id: number): Promise<QuestionAnswerMapping | undefined>;
  listByQuestion(questionId: number): Promise<QuestionAnswerMapping[]>;
  list(filter?: { isActive?: boolean }): Promise<QuestionAnswerMapping[]>;
}

export interface ResolvedQuestionnaireQuestion {
  questionId: number;
  type: MasterQuestion['type'];
  sequence: number;
  text: string;
  /** `questionAnswerId` is the id to submit back (and what depreciation_matrix.questionAnswerId matches against) - `answerId` is just the underlying MasterAnswer, exposed for reference. */
  answers: { questionAnswerId: number; answerId: number; code: string; text: string }[];
}

export interface QuestionnaireConfigRepository {
  create(config: QuestionnaireConfig): Promise<QuestionnaireConfig>;
  update(id: number, patch: Partial<QuestionnaireConfig>): Promise<QuestionnaireConfig>;
  findById(id: number): Promise<QuestionnaireConfig | undefined>;
  list(filter?: { productCategoryId?: number; brandId?: number | null; partnerId?: number | null; isActive?: boolean }): Promise<QuestionnaireConfig[]>;
  /**
   * Core resolution: given a required productCategoryId and optional
   * brandId/partnerId, finds the single most-specific matching tier (see
   * types/domain.ts QuestionnaireConfig doc) and returns its questions,
   * each with its answer options, sorted by sequence and translated into
   * `language` (falling back to "en" when a translation is missing).
   * Returns an empty array when no tier matches at all (e.g. unknown category).
   */
  resolve(productCategoryId: number, brandId: number | undefined, partnerId: number | undefined, language: string): Promise<ResolvedQuestionnaireQuestion[]>;
}

export interface PartnerCategoryVendorMappingRepository {
  create(mapping: PartnerCategoryVendorMapping): Promise<PartnerCategoryVendorMapping>;
  update(id: number, patch: Partial<PartnerCategoryVendorMapping>): Promise<PartnerCategoryVendorMapping>;
  findById(id: number): Promise<PartnerCategoryVendorMapping | undefined>;
  list(filter?: { partnerLocationId?: number; productCategoryId?: number; vendorId?: number; isActive?: boolean }): Promise<PartnerCategoryVendorMapping[]>;
  /** All active vendors mapped for this retail partner location + category - the calculation engine's main lookup. */
  listVendorsFor(partnerLocationId: number, productCategoryId: number): Promise<PartnerCategoryVendorMapping[]>;
}

export interface SkuPricingRepository {
  create(pricing: SkuPricing): Promise<SkuPricing>;
  update(id: number, patch: Partial<SkuPricing>): Promise<SkuPricing>;
  findById(id: number): Promise<SkuPricing | undefined>;
  list(filter?: { vendorId?: number; skuId?: number; isActive?: boolean }): Promise<SkuPricing[]>;
  /** All active price rows for this vendor + SKU (not yet filtered by validity window - the caller decides "as of" which date). */
  listForVendorSku(vendorId: number, skuId: number): Promise<SkuPricing[]>;
}

export interface RequestStatusMasterRepository {
  list(filter?: { isActive?: boolean }): Promise<RequestStatusMaster[]>;
  findById(id: number): Promise<RequestStatusMaster | undefined>;
  findByName(name: string): Promise<RequestStatusMaster | undefined>;
}

export interface BuybackStatusHistoryRepository {
  record(entry: BuybackStatusHistory): Promise<BuybackStatusHistory>;
  listByBuybackRequest(buybackRequestId: number): Promise<BuybackStatusHistory[]>;
}

export interface BuybackVendorCalculationLogRepository {
  record(entry: BuybackVendorCalculationLog): Promise<BuybackVendorCalculationLog>;
  listByBuybackRequest(buybackRequestId: number): Promise<BuybackVendorCalculationLog[]>;
}

export interface DepreciationConfigRepository {
  create(config: DepreciationConfig): Promise<DepreciationConfig>;
  update(id: number, patch: Partial<DepreciationConfig>): Promise<DepreciationConfig>;
  findById(id: number): Promise<DepreciationConfig | undefined>;
  list(filter?: { productCategoryId?: number; brandId?: number; vendorId?: number | null; isActive?: boolean }): Promise<DepreciationConfig[]>;
  /** The single currently-open (validTo blank) set for this exact (category, brand, vendor) triple, if any - used by upload() to know what to version/close out. */
  findActive(productCategoryId: number, brandId: number, vendorId: number | null): Promise<DepreciationConfig | undefined>;
}

export interface DepreciationMatrixRepository {
  create(entry: DepreciationMatrixEntry): Promise<DepreciationMatrixEntry>;
  update(id: number, patch: Partial<DepreciationMatrixEntry>): Promise<DepreciationMatrixEntry>;
  findById(id: number): Promise<DepreciationMatrixEntry | undefined>;
  list(filter?: { depreciationConfigId?: number; questionAnswerId?: number; isActive?: boolean }): Promise<DepreciationMatrixEntry[]>;
  listByConfig(depreciationConfigId: number): Promise<DepreciationMatrixEntry[]>;
}
