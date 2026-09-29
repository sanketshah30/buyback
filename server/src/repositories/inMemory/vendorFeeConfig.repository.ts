import { VendorFeeConfig } from '../../types/domain';
import { VendorFeeConfigRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

function scopeKey(vendorId: number, productCategoryId: number): string {
  return `${vendorId}:${productCategoryId}`;
}

export class InMemoryVendorFeeConfigRepository implements VendorFeeConfigRepository {
  async create(config: VendorFeeConfig): Promise<VendorFeeConfig> {
    tables.vendorFeeConfigs.set(config.id, config);
    addToIndex(indexes.vendorFeeConfigsByScope, scopeKey(config.vendorId, config.productCategoryId), config.id);
    return config;
  }

  async update(id: number, patch: Partial<VendorFeeConfig>): Promise<VendorFeeConfig> {
    const existing = tables.vendorFeeConfigs.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Vendor fee config ${id} not found`), { status: 404 });
    }
    const updated: VendorFeeConfig = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.vendorFeeConfigs.set(id, updated);

    const oldKey = scopeKey(existing.vendorId, existing.productCategoryId);
    const newKey = scopeKey(updated.vendorId, updated.productCategoryId);
    if (oldKey !== newKey) {
      removeFromIndex(indexes.vendorFeeConfigsByScope, oldKey, id);
      addToIndex(indexes.vendorFeeConfigsByScope, newKey, id);
    }
    return updated;
  }

  async findById(id: number): Promise<VendorFeeConfig | undefined> {
    return tables.vendorFeeConfigs.get(id);
  }

  async findByScope(vendorId: number, productCategoryId: number): Promise<VendorFeeConfig | undefined> {
    return getIndexed(indexes.vendorFeeConfigsByScope, scopeKey(vendorId, productCategoryId), tables.vendorFeeConfigs).find((c) => c.isActive);
  }

  async list(filter?: { vendorId?: number; productCategoryId?: number; isActive?: boolean }): Promise<VendorFeeConfig[]> {
    let result = Array.from(tables.vendorFeeConfigs.values());
    if (filter?.vendorId !== undefined) result = result.filter((c) => c.vendorId === filter.vendorId);
    if (filter?.productCategoryId !== undefined) result = result.filter((c) => c.productCategoryId === filter.productCategoryId);
    if (filter?.isActive !== undefined) result = result.filter((c) => c.isActive === filter.isActive);
    return result;
  }

  async resolve(vendorId: number, productCategoryId: number): Promise<VendorFeeConfig | undefined> {
    return this.findByScope(vendorId, productCategoryId);
  }
}
