import {
  Brand,
  BuybackRequest,
  Category,
  OtpChallenge,
  Partner,
  PartnerLocation,
  PartnerType,
  Product,
  Question,
  Role,
  Sku,
  SkuAlias,
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
  findById(id: string): Promise<User | undefined>;
  /** `extra` lets partner/vendor onboarding set username/email/location up front; plain OTP self-signup only ever passes `mobile`. */
  create(mobile: string, extra?: Partial<Pick<User, 'username' | 'email' | 'name' | 'partnerLocationId'>>): Promise<User>;
  update(id: string, patch: Partial<User>): Promise<User>;
  listByLocation(partnerLocationId: string): Promise<User[]>;
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

export interface CatalogRepository {
  listCategories(): Promise<Category[]>;
  /** Brands are standalone (see types/domain.ts); this derives the distinct
   * brands that have at least one active product listed under this category -
   * the equivalent of `SELECT DISTINCT b.* FROM brands b JOIN products p ON
   * p.brand_id = b.id WHERE p.category_id = ? AND p.is_active`. */
  listBrandsByCategory(categoryId: string): Promise<Brand[]>;
  listProducts(categoryId: string, brandId: string): Promise<Product[]>;
  listSkus(productId: string): Promise<Sku[]>;
  listSkuAliases(skuId: string): Promise<SkuAlias[]>;
  getCategory(categoryId: string): Promise<Category | undefined>;
  getBrand(brandId: string): Promise<Brand | undefined>;
  getProduct(productId: string): Promise<Product | undefined>;
  getSku(skuId: string): Promise<Sku | undefined>;
  listQuestions(categoryId: string): Promise<Question[]>;
}

export interface BuybackRepository {
  create(request: BuybackRequest): Promise<BuybackRequest>;
  findById(id: string): Promise<BuybackRequest | undefined>;
  update(id: string, patch: Partial<BuybackRequest>): Promise<BuybackRequest>;
  listByUser(userId: string): Promise<BuybackRequest[]>;
  nextDailySequence(dateKey: string): Promise<number>;
}

export interface PartnerRepository {
  create(partner: Partner): Promise<Partner>;
  update(id: string, patch: Partial<Partner>): Promise<Partner>;
  findById(id: string): Promise<Partner | undefined>;
  findByUniqueIdentifier(uniqueIdentifier: string): Promise<Partner | undefined>;
  list(filter?: { isActive?: boolean; partnerType?: PartnerType }): Promise<Partner[]>;
}

export interface PartnerLocationRepository {
  create(location: PartnerLocation): Promise<PartnerLocation>;
  update(id: string, patch: Partial<PartnerLocation>): Promise<PartnerLocation>;
  findById(id: string): Promise<PartnerLocation | undefined>;
  findByUniqueIdentifier(uniqueIdentifier: string): Promise<PartnerLocation | undefined>;
  listByPartner(partnerId: string): Promise<PartnerLocation[]>;
  list(filter?: { isActive?: boolean }): Promise<PartnerLocation[]>;
}

export interface RoleRepository {
  create(role: Role): Promise<Role>;
  update(id: string, patch: Partial<Role>): Promise<Role>;
  findById(id: string): Promise<Role | undefined>;
  list(filter?: { isActive?: boolean }): Promise<Role[]>;
}

export interface UserRoleRepository {
  assign(userRole: UserRole): Promise<UserRole>;
  /** Soft-revokes the assignment (isActive=false) rather than deleting the row, preserving the audit trail. */
  revoke(userId: string, roleId: string): Promise<void>;
  listByUser(userId: string): Promise<UserRole[]>;
  findActive(userId: string, roleId: string): Promise<UserRole | undefined>;
}

export interface UserLocationHistoryRepository {
  record(entry: UserLocationHistory): Promise<UserLocationHistory>;
  listByUser(userId: string): Promise<UserLocationHistory[]>;
}
