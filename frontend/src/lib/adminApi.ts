import { api } from './api';
import type {
  AdminUser,
  Brand,
  Category,
  DepreciationConfig,
  DepreciationMatrixEntry,
  DepreciationType,
  DeviceCategoryType,
  Partner,
  PartnerLocation,
  PartnerType,
  Product,
  QuestionAnswerMapping,
  Role,
  Sku,
  SkuPricing,
} from '../types/api';

// Every call is POST + JSON body. Ids only ever travel in the body (never the
// URL), and "delete" is a soft-deactivate via `update { id, isActive: false }`.

export interface SearchFilter {
  isActive?: boolean;
}

/** Catalog paths are /search|/create|/get|/update; every other resource uses /search|/|/get|/update. */
function resource<T, Filter extends object, Create extends object, Update extends object>(
  base: string,
  createPath: string,
) {
  return {
    search: (filter: Filter = {} as Filter) => api.post<T[]>(`${base}/search`, filter),
    create: (body: Create) => api.post<T>(createPath, body),
    get: (id: number) => api.post<T>(`${base}/get`, { id }),
    update: (id: number, body: Update) => api.post<T>(`${base}/update`, { id, ...body }),
  };
}

function catalogResource<T, Filter extends object, Create extends object, Update extends object>(name: string) {
  const base = `/api/admin/catalog/${name}`;
  return resource<T, Filter, Create, Update>(base, `${base}/create`);
}

function standardResource<T, Filter extends object, Create extends object, Update extends object>(base: string) {
  return resource<T, Filter, Create, Update>(base, `${base}/`);
}

// ---- Catalog (manage_catalog) ----------------------------------------------

export const categoriesApi = catalogResource<
  Category,
  SearchFilter,
  { name: string; type: DeviceCategoryType },
  { name?: string; type?: DeviceCategoryType; isActive?: boolean }
>('categories');

export const brandsApi = catalogResource<Brand, SearchFilter, { name: string }, { name?: string; isActive?: boolean }>('brands');

export const productsApi = catalogResource<
  Product,
  SearchFilter & { categoryId?: number; brandId?: number },
  { categoryId: number; brandId: number; name: string },
  { categoryId?: number; brandId?: number; name?: string; isActive?: boolean }
>('products');

export const skusApi = catalogResource<
  Sku,
  SearchFilter & { productId?: number },
  { productId: number; code: string; label: string },
  { productId?: number; code?: string; label?: string; isActive?: boolean }
>('skus');

// ---- Partners (manage_partners) --------------------------------------------

export interface PartnerFields {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  partnerType: PartnerType;
  uniqueIdentifier: string;
  email?: string;
}

export const partnersApi = standardResource<
  Partner,
  SearchFilter & { partnerType?: PartnerType },
  PartnerFields,
  Partial<PartnerFields> & { isActive?: boolean }
>('/api/partners');

// ---- Partner locations (manage_locations) ----------------------------------

export interface PartnerLocationFields {
  partnerId: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  uniqueIdentifier: string;
  email?: string;
}

export const partnerLocationsApi = standardResource<
  PartnerLocation,
  SearchFilter & { partnerId?: number },
  PartnerLocationFields,
  // partnerId is required by the server on update too.
  Partial<PartnerLocationFields> & { partnerId: number; isActive?: boolean }
>('/api/partner-locations');

// ---- Users (manage_users) --------------------------------------------------

export const usersApi = standardResource<
  AdminUser,
  SearchFilter & { partnerLocationId?: number },
  { mobile: string; partnerLocationId: number; name?: string; username?: string; email?: string; roleIds?: number[] },
  { name?: string; username?: string; email?: string; partnerLocationId?: number; isActive?: boolean }
>('/api/users');

export const rolesApi = {
  search: (filter: SearchFilter = {}) => api.post<Role[]>('/api/roles/search', filter),
};

// ---- Pricing (manage_pricing) ----------------------------------------------

export const skuPricingApi = standardResource<
  SkuPricing,
  SearchFilter & { vendorId?: number; skuId?: number },
  { vendorId: number; skuId: number; price: number; validFrom: string; validTo?: string },
  { price?: number; validFrom?: string; validTo?: string | null; isActive?: boolean }
>('/api/sku-pricing');

export interface DepreciationEntryInput {
  questionAnswerId: number;
  depreciationType: DepreciationType;
  depreciationValue: number;
}

export const depreciationConfigApi = standardResource<
  DepreciationConfig,
  SearchFilter & { productCategoryId?: number; brandId?: number; vendorId?: number | null },
  { productCategoryId: number; brandId: number; vendorId?: number; entries: DepreciationEntryInput[] },
  { validTo?: string | null; isActive?: boolean }
>('/api/depreciation-config');

export const depreciationMatrixApi = standardResource<
  DepreciationMatrixEntry,
  SearchFilter & { depreciationConfigId?: number; questionAnswerId?: number },
  { depreciationConfigId: number; questionAnswerId: number; depreciationType: DepreciationType; depreciationValue: number },
  { depreciationType?: DepreciationType; depreciationValue?: number; isActive?: boolean }
>('/api/depreciation-matrix');

// ---- Lookups ---------------------------------------------------------------

export const questionAnswersApi = {
  search: (filter: SearchFilter = {}) => api.post<QuestionAnswerMapping[]>('/api/question-answers/search', filter),
};
