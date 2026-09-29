import { brands, categories } from '../../data/catalog.seed';
import { Brand, Category, Product, Sku, SkuAlias } from '../../types/domain';
import { CatalogRepository } from '../interfaces';
import { tables, indexes } from './db';
import { getIndexed } from './indexUtils';

export class InMemoryCatalogRepository implements CatalogRepository {
  async listCategories(): Promise<Category[]> {
    return categories.filter((c) => c.isActive);
  }

  async listBrandsByCategory(categoryId: number): Promise<Brand[]> {
    // Indexed via productsByCategory rather than scanning every product.
    const productIds = indexes.productsByCategory.get(categoryId) ?? new Set<number>();
    const brandIds = new Set<number>();
    for (const productId of productIds) {
      const product = tables.products.get(productId);
      if (product?.isActive) brandIds.add(product.brandId);
    }
    return brands.filter((b) => brandIds.has(b.id) && b.isActive);
  }

  async listProducts(categoryId: number, brandId: number): Promise<Product[]> {
    return getIndexed(indexes.productsByCategoryAndBrand, `${categoryId}:${brandId}`, tables.products).filter((p) => p.isActive);
  }

  async listSkus(productId: number): Promise<Sku[]> {
    return getIndexed(indexes.skusByProductId, productId, tables.skus).filter((s) => s.isActive);
  }

  async listSkuAliases(skuId: number): Promise<SkuAlias[]> {
    return getIndexed(indexes.skuAliasesBySkuId, skuId, tables.skuAliases).filter((a) => a.isActive);
  }

  async getCategory(categoryId: number): Promise<Category | undefined> {
    return categories.find((c) => c.id === categoryId && c.isActive);
  }

  async getBrand(brandId: number): Promise<Brand | undefined> {
    return brands.find((b) => b.id === brandId && b.isActive);
  }

  async getProduct(productId: number): Promise<Product | undefined> {
    return tables.products.get(productId);
  }

  async getSku(skuId: number): Promise<Sku | undefined> {
    return tables.skus.get(skuId);
  }
}
