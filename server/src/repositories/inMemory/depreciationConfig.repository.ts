import { DepreciationConfig } from '../../types/domain';
import { DepreciationConfigRepository } from '../interfaces';
import { indexes, profileKey, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

export class InMemoryDepreciationConfigRepository implements DepreciationConfigRepository {
  async create(config: DepreciationConfig): Promise<DepreciationConfig> {
    tables.depreciationConfigs.set(config.id, config);
    addToIndex(indexes.depreciationConfigsByCategory, config.productCategoryId, config.id);
    addToIndex(indexes.depreciationConfigsByBrand, config.brandId, config.id);
    addToIndex(indexes.depreciationConfigsByProfile, profileKey(config.productCategoryId, config.brandId, config.vendorId), config.id);
    return config;
  }

  async update(id: number, patch: Partial<DepreciationConfig>): Promise<DepreciationConfig> {
    const existing = tables.depreciationConfigs.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Depreciation config ${id} not found`), { status: 404 });
    }
    const updated: DepreciationConfig = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.depreciationConfigs.set(id, updated);

    const categoryChanged = patch.productCategoryId !== undefined && patch.productCategoryId !== existing.productCategoryId;
    const brandChanged = patch.brandId !== undefined && patch.brandId !== existing.brandId;
    const vendorChanged = 'vendorId' in patch && patch.vendorId !== existing.vendorId;
    if (categoryChanged) {
      removeFromIndex(indexes.depreciationConfigsByCategory, existing.productCategoryId, id);
      addToIndex(indexes.depreciationConfigsByCategory, updated.productCategoryId, id);
    }
    if (brandChanged) {
      removeFromIndex(indexes.depreciationConfigsByBrand, existing.brandId, id);
      addToIndex(indexes.depreciationConfigsByBrand, updated.brandId, id);
    }
    if (categoryChanged || brandChanged || vendorChanged) {
      removeFromIndex(indexes.depreciationConfigsByProfile, profileKey(existing.productCategoryId, existing.brandId, existing.vendorId), id);
      addToIndex(indexes.depreciationConfigsByProfile, profileKey(updated.productCategoryId, updated.brandId, updated.vendorId), id);
    }
    return updated;
  }

  async findById(id: number): Promise<DepreciationConfig | undefined> {
    return tables.depreciationConfigs.get(id);
  }

  async list(filter?: {
    productCategoryId?: number;
    brandId?: number;
    vendorId?: number | null;
    isActive?: boolean;
  }): Promise<DepreciationConfig[]> {
    let result: DepreciationConfig[];
    if (filter?.productCategoryId !== undefined) {
      result = getIndexed(indexes.depreciationConfigsByCategory, filter.productCategoryId, tables.depreciationConfigs);
    } else if (filter?.brandId !== undefined) {
      result = getIndexed(indexes.depreciationConfigsByBrand, filter.brandId, tables.depreciationConfigs);
    } else {
      result = Array.from(tables.depreciationConfigs.values());
    }
    if (filter?.brandId !== undefined) result = result.filter((c) => c.brandId === filter.brandId);
    if (filter?.vendorId !== undefined) result = result.filter((c) => c.vendorId === filter.vendorId);
    if (filter?.isActive !== undefined) result = result.filter((c) => c.isActive === filter.isActive);
    return result;
  }

  async findActive(productCategoryId: number, brandId: number, vendorId: number | null): Promise<DepreciationConfig | undefined> {
    const candidates = getIndexed(indexes.depreciationConfigsByProfile, profileKey(productCategoryId, brandId, vendorId), tables.depreciationConfigs);
    return candidates.find((c) => c.isActive && !c.validTo);
  }
}
