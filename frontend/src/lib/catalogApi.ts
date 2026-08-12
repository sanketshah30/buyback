import { api } from './api';
import type { Brand, Category, Model, Question, Sku } from '../types/api';

export const catalogApi = {
  listCategories: () => api.get<Category[]>('/api/catalog/categories'),
  listBrands: (categoryId: string) => api.get<Brand[]>(`/api/catalog/brands?categoryId=${categoryId}`),
  listModels: (categoryId: string, brandId: string) =>
    api.get<Model[]>(`/api/catalog/models?categoryId=${categoryId}&brandId=${brandId}`),
  listSkus: (modelId: string) => api.get<Sku[]>(`/api/catalog/skus?modelId=${modelId}`),
  listQuestions: (categoryId: string) => api.get<Question[]>(`/api/catalog/questions?categoryId=${categoryId}`),
};
