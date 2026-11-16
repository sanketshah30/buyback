import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRight } from '../middleware/rights.middleware';
import { catalogRepository } from '../repositories';
import { Brand, Category, DeviceCategoryType, Product, Sku } from '../types/domain';
import { httpError, requireBodyId } from '../utils/httpError';
import { allocateId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

/**
 * Admin catalog management (categories, brands, products, SKUs). Mounted at
 * /api/admin/catalog. Everything is POST + JSON body (ids never appear in
 * URLs) and "delete" is a soft-deactivate via `update { isActive: false }`.
 */
export const adminCatalogRouter = Router();
adminCatalogRouter.use(requireAuth);
adminCatalogRouter.use(requireRight('manage_catalog'));

const CATEGORY_TYPES: DeviceCategoryType[] = ['smartphone', 'non-smartphone'];

type Handler = (req: Request, res: Response) => Promise<unknown>;

function route(handler: Handler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

function bodyOf(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
}

function optionalBool(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw httpError(`${key} must be a boolean`, 400);
  return value;
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) throw httpError(`${key} is required`, 400);
  return value.trim();
}

function optionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) throw httpError(`${key} must be a non-empty string`, 400);
  return value.trim();
}

function requiredId(body: Record<string, unknown>, key: string): number {
  const id = parseId(body[key]);
  if (id === undefined) throw httpError(`${key} is required and must be a valid integer id`, 400);
  return id;
}

function optionalId(body: Record<string, unknown>, key: string): number | undefined {
  if (body[key] === undefined) return undefined;
  return requiredId(body, key);
}

function parseCategoryType(value: unknown): DeviceCategoryType {
  if (typeof value !== 'string' || !CATEGORY_TYPES.includes(value as DeviceCategoryType)) {
    throw httpError(`type must be one of: ${CATEGORY_TYPES.join(', ')}`, 400);
  }
  return value as DeviceCategoryType;
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

async function assertCategoryExists(id: number): Promise<void> {
  const category = await catalogRepository.findCategoryById(id);
  if (!category) throw httpError('Unknown categoryId', 404);
}

async function assertBrandExists(id: number): Promise<void> {
  const brand = await catalogRepository.findBrandById(id);
  if (!brand) throw httpError('Unknown brandId', 404);
}

async function assertProductExists(id: number): Promise<void> {
  const product = await catalogRepository.getProduct(id);
  if (!product) throw httpError('Unknown productId', 404);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

adminCatalogRouter.post(
  '/categories/search',
  route(async (req, res) => {
    const isActive = optionalBool(bodyOf(req), 'isActive');
    res.json(await catalogRepository.searchCategories({ isActive }));
  }),
);

adminCatalogRouter.post(
  '/categories/create',
  route(async (req, res) => {
    const body = bodyOf(req);
    const name = requiredString(body, 'name');
    const type = parseCategoryType(body.type);

    const all = await catalogRepository.searchCategories();
    if (all.some((c) => sameText(c.name, name))) throw httpError(`A category named "${name}" already exists`, 409);

    const now = new Date().toISOString();
    const category: Category = {
      id: await allocateId('categories'),
      name,
      type,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    res.status(201).json(await catalogRepository.createCategory(category));
  }),
);

adminCatalogRouter.post(
  '/categories/get',
  route(async (req, res) => {
    const category = await catalogRepository.findCategoryById(requireBodyId(req.body));
    if (!category) throw httpError('Category not found', 404);
    res.json(category);
  }),
);

adminCatalogRouter.post(
  '/categories/update',
  route(async (req, res) => {
    const id = requireBodyId(req.body);
    const body = bodyOf(req);
    const existing = await catalogRepository.findCategoryById(id);
    if (!existing) throw httpError('Category not found', 404);

    const patch: Partial<Category> = {};
    const name = optionalString(body, 'name');
    if (name !== undefined) {
      const all = await catalogRepository.searchCategories();
      if (all.some((c) => c.id !== id && sameText(c.name, name))) {
        throw httpError(`A category named "${name}" already exists`, 409);
      }
      patch.name = name;
    }
    if (body.type !== undefined) patch.type = parseCategoryType(body.type);
    const isActive = optionalBool(body, 'isActive');
    if (isActive !== undefined) patch.isActive = isActive;

    res.json(await catalogRepository.updateCategory(id, patch));
  }),
);

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

adminCatalogRouter.post(
  '/brands/search',
  route(async (req, res) => {
    const isActive = optionalBool(bodyOf(req), 'isActive');
    res.json(await catalogRepository.searchBrands({ isActive }));
  }),
);

adminCatalogRouter.post(
  '/brands/create',
  route(async (req, res) => {
    const name = requiredString(bodyOf(req), 'name');

    const all = await catalogRepository.searchBrands();
    if (all.some((b) => sameText(b.name, name))) throw httpError(`A brand named "${name}" already exists`, 409);

    const now = new Date().toISOString();
    const brand: Brand = { id: await allocateId('brands'), name, createdAt: now, updatedAt: now, isActive: true };
    res.status(201).json(await catalogRepository.createBrand(brand));
  }),
);

adminCatalogRouter.post(
  '/brands/get',
  route(async (req, res) => {
    const brand = await catalogRepository.findBrandById(requireBodyId(req.body));
    if (!brand) throw httpError('Brand not found', 404);
    res.json(brand);
  }),
);

adminCatalogRouter.post(
  '/brands/update',
  route(async (req, res) => {
    const id = requireBodyId(req.body);
    const body = bodyOf(req);
    const existing = await catalogRepository.findBrandById(id);
    if (!existing) throw httpError('Brand not found', 404);

    const patch: Partial<Brand> = {};
    const name = optionalString(body, 'name');
    if (name !== undefined) {
      const all = await catalogRepository.searchBrands();
      if (all.some((b) => b.id !== id && sameText(b.name, name))) {
        throw httpError(`A brand named "${name}" already exists`, 409);
      }
      patch.name = name;
    }
    const isActive = optionalBool(body, 'isActive');
    if (isActive !== undefined) patch.isActive = isActive;

    res.json(await catalogRepository.updateBrand(id, patch));
  }),
);

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

adminCatalogRouter.post(
  '/products/search',
  route(async (req, res) => {
    const body = bodyOf(req);
    const categoryId = optionalId(body, 'categoryId');
    const brandId = optionalId(body, 'brandId');
    const isActive = optionalBool(body, 'isActive');
    res.json(await catalogRepository.searchProducts({ categoryId, brandId, isActive }));
  }),
);

adminCatalogRouter.post(
  '/products/create',
  route(async (req, res) => {
    const body = bodyOf(req);
    const categoryId = requiredId(body, 'categoryId');
    const brandId = requiredId(body, 'brandId');
    const name = requiredString(body, 'name');

    await assertCategoryExists(categoryId);
    await assertBrandExists(brandId);

    const siblings = await catalogRepository.searchProducts({ categoryId, brandId });
    if (siblings.some((p) => sameText(p.name, name))) {
      throw httpError(`A product named "${name}" already exists for this category and brand`, 409);
    }

    const now = new Date().toISOString();
    const product: Product = {
      id: await allocateId('products'),
      categoryId,
      brandId,
      name,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    res.status(201).json(await catalogRepository.createProduct(product));
  }),
);

adminCatalogRouter.post(
  '/products/get',
  route(async (req, res) => {
    const product = await catalogRepository.getProduct(requireBodyId(req.body));
    if (!product) throw httpError('Product not found', 404);
    res.json(product);
  }),
);

adminCatalogRouter.post(
  '/products/update',
  route(async (req, res) => {
    const id = requireBodyId(req.body);
    const body = bodyOf(req);
    const existing = await catalogRepository.getProduct(id);
    if (!existing) throw httpError('Product not found', 404);

    const patch: Partial<Product> = {};
    const categoryId = optionalId(body, 'categoryId');
    const brandId = optionalId(body, 'brandId');
    const name = optionalString(body, 'name');
    if (categoryId !== undefined && categoryId !== existing.categoryId) {
      await assertCategoryExists(categoryId);
      patch.categoryId = categoryId;
    }
    if (brandId !== undefined && brandId !== existing.brandId) {
      await assertBrandExists(brandId);
      patch.brandId = brandId;
    }
    if (name !== undefined) patch.name = name;

    const nextCategoryId = patch.categoryId ?? existing.categoryId;
    const nextBrandId = patch.brandId ?? existing.brandId;
    const nextName = patch.name ?? existing.name;
    if (patch.categoryId !== undefined || patch.brandId !== undefined || patch.name !== undefined) {
      const siblings = await catalogRepository.searchProducts({ categoryId: nextCategoryId, brandId: nextBrandId });
      if (siblings.some((p) => p.id !== id && sameText(p.name, nextName))) {
        throw httpError(`A product named "${nextName}" already exists for this category and brand`, 409);
      }
    }

    const isActive = optionalBool(body, 'isActive');
    if (isActive !== undefined) patch.isActive = isActive;

    res.json(await catalogRepository.updateProduct(id, patch));
  }),
);

// ---------------------------------------------------------------------------
// SKUs
// ---------------------------------------------------------------------------

adminCatalogRouter.post(
  '/skus/search',
  route(async (req, res) => {
    const body = bodyOf(req);
    const productId = optionalId(body, 'productId');
    const isActive = optionalBool(body, 'isActive');
    res.json(await catalogRepository.searchSkus({ productId, isActive }));
  }),
);

adminCatalogRouter.post(
  '/skus/create',
  route(async (req, res) => {
    const body = bodyOf(req);
    const productId = requiredId(body, 'productId');
    const code = requiredString(body, 'code');
    const label = requiredString(body, 'label');

    await assertProductExists(productId);

    const all = await catalogRepository.searchSkus();
    if (all.some((s) => sameText(s.code, code))) throw httpError(`A SKU with code "${code}" already exists`, 409);

    const now = new Date().toISOString();
    const sku: Sku = {
      id: await allocateId('skus'),
      productId,
      code,
      label,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    res.status(201).json(await catalogRepository.createSku(sku));
  }),
);

adminCatalogRouter.post(
  '/skus/get',
  route(async (req, res) => {
    const sku = await catalogRepository.getSku(requireBodyId(req.body));
    if (!sku) throw httpError('SKU not found', 404);
    res.json(sku);
  }),
);

adminCatalogRouter.post(
  '/skus/update',
  route(async (req, res) => {
    const id = requireBodyId(req.body);
    const body = bodyOf(req);
    const existing = await catalogRepository.getSku(id);
    if (!existing) throw httpError('SKU not found', 404);

    const patch: Partial<Sku> = {};
    const productId = optionalId(body, 'productId');
    if (productId !== undefined && productId !== existing.productId) {
      await assertProductExists(productId);
      patch.productId = productId;
    }
    const code = optionalString(body, 'code');
    if (code !== undefined) {
      const all = await catalogRepository.searchSkus();
      if (all.some((s) => s.id !== id && sameText(s.code, code))) {
        throw httpError(`A SKU with code "${code}" already exists`, 409);
      }
      patch.code = code;
    }
    const label = optionalString(body, 'label');
    if (label !== undefined) patch.label = label;
    const isActive = optionalBool(body, 'isActive');
    if (isActive !== undefined) patch.isActive = isActive;

    res.json(await catalogRepository.updateSku(id, patch));
  }),
);
