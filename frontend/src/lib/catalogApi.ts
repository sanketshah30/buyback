import { api } from './api';
import type { Brand, Category, Product, Question, Sku, SkuAlias } from '../types/api';

// All catalog lookups are POST + JSON body, never GET + query string, so
// filter values never end up in URLs/server logs/browser history. These are
// still pure reads (nothing is mutated) - see server/src/routes/catalog.routes.ts.
export const catalogApi = {
  listCategories: () => api.post<Category[]>('/api/catalog/categories'),
  listBrands: (categoryId: number) => api.post<Brand[]>('/api/catalog/brands', { categoryId }),
  listProducts: (categoryId: number, brandId: number) =>
    api.post<Product[]>('/api/catalog/products', { categoryId, brandId }),
  listSkus: (productId: number) => api.post<Sku[]>('/api/catalog/skus', { productId }),
  listSkuAliases: (skuId: number) => api.post<SkuAlias[]>('/api/catalog/sku-aliases', { skuId }),
  listQuestions: (categoryId: number) => api.post<Question[]>('/api/catalog/questions', { categoryId }),
};
