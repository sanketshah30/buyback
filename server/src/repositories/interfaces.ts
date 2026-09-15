import {
  Brand,
  BuybackRequest,
  Category,
  OtpChallenge,
  Product,
  Question,
  Sku,
  SkuAlias,
  User,
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
  create(mobile: string): Promise<User>;
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
