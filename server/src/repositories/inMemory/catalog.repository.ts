import { Brand, Category, Product, Sku, SkuAlias } from '../../types/domain';
import { CatalogRepository } from '../interfaces';
import { tables, indexes } from './db';
import { addToIndex, getIndexed } from './indexUtils';

function notFound(label: string, id: number): Error {
  return Object.assign(new Error(`${label} ${id} not found`), { status: 404 });
}

export class InMemoryCatalogRepository implements CatalogRepository {
  async listCategories(): Promise<Category[]> {
    return [...tables.categories.values()].filter((c) => c.isActive);
  }

  async searchCategories(filter?: { isActive?: boolean }): Promise<Category[]> {
    let rows = [...tables.categories.values()];
    if (filter?.isActive !== undefined) rows = rows.filter((c) => c.isActive === filter.isActive);
    return rows.sort((a, b) => a.id - b.id);
  }

  async createCategory(category: Category): Promise<Category> {
    tables.categories.set(category.id, category);
    return category;
  }

  async updateCategory(id: number, patch: Partial<Category>): Promise<Category> {
    const existing = tables.categories.get(id);
    if (!existing) throw notFound('Category', id);
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    tables.categories.set(id, updated);
    return updated;
  }

  async listBrandsByCategory(categoryId: number): Promise<Brand[]> {
    const productIds = indexes.productsByCategory.get(categoryId) ?? new Set<number>();
    const brandIds = new Set<number>();
    for (const productId of productIds) {
      const product = tables.products.get(productId);
      if (product?.isActive) brandIds.add(product.brandId);
    }
    return [...tables.brands.values()].filter((b) => brandIds.has(b.id) && b.isActive);
  }

  async searchBrands(filter?: { isActive?: boolean }): Promise<Brand[]> {
    let rows = [...tables.brands.values()];
    if (filter?.isActive !== undefined) rows = rows.filter((b) => b.isActive === filter.isActive);
    return rows.sort((a, b) => a.id - b.id);
  }

  async createBrand(brand: Brand): Promise<Brand> {
    tables.brands.set(brand.id, brand);
    return brand;
  }

  async updateBrand(id: number, patch: Partial<Brand>): Promise<Brand> {
    const existing = tables.brands.get(id);
    if (!existing) throw notFound('Brand', id);
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    tables.brands.set(id, updated);
    return updated;
  }

  async listProducts(categoryId: number, brandId: number): Promise<Product[]> {
    return getIndexed(indexes.productsByCategoryAndBrand, `${categoryId}:${brandId}`, tables.products).filter(
      (p) => p.isActive,
    );
  }

  async searchProducts(filter?: { categoryId?: number; brandId?: number; isActive?: boolean }): Promise<Product[]> {
    let rows = [...tables.products.values()];
    if (filter?.categoryId !== undefined) rows = rows.filter((p) => p.categoryId === filter.categoryId);
    if (filter?.brandId !== undefined) rows = rows.filter((p) => p.brandId === filter.brandId);
    if (filter?.isActive !== undefined) rows = rows.filter((p) => p.isActive === filter.isActive);
    return rows.sort((a, b) => a.id - b.id);
  }

  async createProduct(product: Product): Promise<Product> {
    tables.products.set(product.id, product);
    addToIndex(indexes.productsByCategory, product.categoryId, product.id);
    addToIndex(indexes.productsByCategoryAndBrand, `${product.categoryId}:${product.brandId}`, product.id);
    return product;
  }

  async updateProduct(id: number, patch: Partial<Product>): Promise<Product> {
    const existing = tables.products.get(id);
    if (!existing) throw notFound('Product', id);
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    tables.products.set(id, updated);
    return updated;
  }

  async listSkus(productId: number): Promise<Sku[]> {
    return getIndexed(indexes.skusByProductId, productId, tables.skus).filter((s) => s.isActive);
  }

  async searchSkus(filter?: { productId?: number; isActive?: boolean }): Promise<Sku[]> {
    let rows = [...tables.skus.values()];
    if (filter?.productId !== undefined) rows = rows.filter((s) => s.productId === filter.productId);
    if (filter?.isActive !== undefined) rows = rows.filter((s) => s.isActive === filter.isActive);
    return rows.sort((a, b) => a.id - b.id);
  }

  async createSku(sku: Sku): Promise<Sku> {
    tables.skus.set(sku.id, sku);
    addToIndex(indexes.skusByProductId, sku.productId, sku.id);
    return sku;
  }

  async updateSku(id: number, patch: Partial<Sku>): Promise<Sku> {
    const existing = tables.skus.get(id);
    if (!existing) throw notFound('SKU', id);
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    tables.skus.set(id, updated);
    return updated;
  }

  async listSkuAliases(skuId: number): Promise<SkuAlias[]> {
    return getIndexed(indexes.skuAliasesBySkuId, skuId, tables.skuAliases).filter((a) => a.isActive);
  }

  async getCategory(categoryId: number): Promise<Category | undefined> {
    const row = tables.categories.get(categoryId);
    return row?.isActive ? row : undefined;
  }

  async findCategoryById(id: number): Promise<Category | undefined> {
    return tables.categories.get(id);
  }

  async getBrand(brandId: number): Promise<Brand | undefined> {
    const row = tables.brands.get(brandId);
    return row?.isActive ? row : undefined;
  }

  async findBrandById(id: number): Promise<Brand | undefined> {
    return tables.brands.get(id);
  }

  async getProduct(productId: number): Promise<Product | undefined> {
    return tables.products.get(productId);
  }

  async getSku(skuId: number): Promise<Sku | undefined> {
    return tables.skus.get(skuId);
  }
}
