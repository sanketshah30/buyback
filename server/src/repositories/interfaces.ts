import {
  Brand,
  BuybackRequest,
  Category,
  Model,
  OtpChallenge,
  Question,
  Sku,
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
}

export interface CatalogRepository {
  listCategories(): Promise<Category[]>;
  listBrands(categoryId: string): Promise<Brand[]>;
  listModels(categoryId: string, brandId: string): Promise<Model[]>;
  listSkus(modelId: string): Promise<Sku[]>;
  getCategory(categoryId: string): Promise<Category | undefined>;
  getBrand(brandId: string): Promise<Brand | undefined>;
  getModel(modelId: string): Promise<Model | undefined>;
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
