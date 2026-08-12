import { brands, categories, models, questionsByCategory, skus } from '../../data/catalog.seed';
import { Brand, Category, Model, Question, Sku } from '../../types/domain';
import { CatalogRepository } from '../interfaces';

export class InMemoryCatalogRepository implements CatalogRepository {
  async listCategories(): Promise<Category[]> {
    return categories;
  }

  async listBrands(categoryId: string): Promise<Brand[]> {
    return brands.filter((b) => b.categoryId === categoryId);
  }

  async listModels(categoryId: string, brandId: string): Promise<Model[]> {
    return models.filter((m) => m.categoryId === categoryId && m.brandId === brandId);
  }

  async listSkus(modelId: string): Promise<Sku[]> {
    return skus.filter((s) => s.modelId === modelId);
  }

  async getCategory(categoryId: string): Promise<Category | undefined> {
    return categories.find((c) => c.id === categoryId);
  }

  async getBrand(brandId: string): Promise<Brand | undefined> {
    return brands.find((b) => b.id === brandId);
  }

  async getModel(modelId: string): Promise<Model | undefined> {
    return models.find((m) => m.id === modelId);
  }

  async getSku(skuId: string): Promise<Sku | undefined> {
    return skus.find((s) => s.id === skuId);
  }

  async listQuestions(categoryId: string): Promise<Question[]> {
    return questionsByCategory[categoryId] ?? [];
  }
}
