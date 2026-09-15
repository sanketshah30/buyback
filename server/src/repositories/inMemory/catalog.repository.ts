import { brands, categories, products, questionsByCategory, skuAliases, skus } from '../../data/catalog.seed';
import { Brand, Category, Product, Question, Sku, SkuAlias } from '../../types/domain';
import { CatalogRepository } from '../interfaces';

export class InMemoryCatalogRepository implements CatalogRepository {
  async listCategories(): Promise<Category[]> {
    return categories.filter((c) => c.isActive);
  }

  async listBrandsByCategory(categoryId: string): Promise<Brand[]> {
    const brandIds = new Set(
      products.filter((p) => p.categoryId === categoryId && p.isActive).map((p) => p.brandId),
    );
    return brands.filter((b) => brandIds.has(b.id) && b.isActive);
  }

  async listProducts(categoryId: string, brandId: string): Promise<Product[]> {
    return products.filter((p) => p.categoryId === categoryId && p.brandId === brandId && p.isActive);
  }

  async listSkus(productId: string): Promise<Sku[]> {
    return skus.filter((s) => s.productId === productId && s.isActive);
  }

  async listSkuAliases(skuId: string): Promise<SkuAlias[]> {
    return skuAliases.filter((a) => a.skuId === skuId && a.isActive);
  }

  async getCategory(categoryId: string): Promise<Category | undefined> {
    return categories.find((c) => c.id === categoryId && c.isActive);
  }

  async getBrand(brandId: string): Promise<Brand | undefined> {
    return brands.find((b) => b.id === brandId && b.isActive);
  }

  async getProduct(productId: string): Promise<Product | undefined> {
    return products.find((p) => p.id === productId && p.isActive);
  }

  async getSku(skuId: string): Promise<Sku | undefined> {
    return skus.find((s) => s.id === skuId && s.isActive);
  }

  async listQuestions(categoryId: string): Promise<Question[]> {
    return questionsByCategory[categoryId] ?? [];
  }
}
