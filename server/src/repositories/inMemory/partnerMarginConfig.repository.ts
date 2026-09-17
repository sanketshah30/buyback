import { PartnerMarginConfig } from '../../types/domain';
import { PartnerMarginConfigRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

function scopeKey(partnerId: number, partnerLocationId: number, productCategoryId: number): string {
  return `${partnerId}:${partnerLocationId}:${productCategoryId}`;
}

export class InMemoryPartnerMarginConfigRepository implements PartnerMarginConfigRepository {
  async create(config: PartnerMarginConfig): Promise<PartnerMarginConfig> {
    tables.partnerMarginConfigs.set(config.id, config);
    addToIndex(indexes.partnerMarginConfigsByScope, scopeKey(config.partnerId, config.partnerLocationId, config.productCategoryId), config.id);
    return config;
  }

  async update(id: number, patch: Partial<PartnerMarginConfig>): Promise<PartnerMarginConfig> {
    const existing = tables.partnerMarginConfigs.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Partner margin config ${id} not found`), { status: 404 });
    }
    const updated: PartnerMarginConfig = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.partnerMarginConfigs.set(id, updated);

    const oldKey = scopeKey(existing.partnerId, existing.partnerLocationId, existing.productCategoryId);
    const newKey = scopeKey(updated.partnerId, updated.partnerLocationId, updated.productCategoryId);
    if (oldKey !== newKey) {
      removeFromIndex(indexes.partnerMarginConfigsByScope, oldKey, id);
      addToIndex(indexes.partnerMarginConfigsByScope, newKey, id);
    }
    return updated;
  }

  async findById(id: number): Promise<PartnerMarginConfig | undefined> {
    return tables.partnerMarginConfigs.get(id);
  }

  async findByScope(partnerId: number, partnerLocationId: number, productCategoryId: number): Promise<PartnerMarginConfig | undefined> {
    return getIndexed(indexes.partnerMarginConfigsByScope, scopeKey(partnerId, partnerLocationId, productCategoryId), tables.partnerMarginConfigs).find(
      (c) => c.isActive,
    );
  }

  async list(filter?: {
    partnerId?: number;
    partnerLocationId?: number;
    productCategoryId?: number;
    isActive?: boolean;
  }): Promise<PartnerMarginConfig[]> {
    let result = Array.from(tables.partnerMarginConfigs.values());
    if (filter?.partnerId !== undefined) result = result.filter((c) => c.partnerId === filter.partnerId);
    if (filter?.partnerLocationId !== undefined) result = result.filter((c) => c.partnerLocationId === filter.partnerLocationId);
    if (filter?.productCategoryId !== undefined) result = result.filter((c) => c.productCategoryId === filter.productCategoryId);
    if (filter?.isActive !== undefined) result = result.filter((c) => c.isActive === filter.isActive);
    return result;
  }

  async resolve(partnerId: number, partnerLocationId: number, productCategoryId: number): Promise<PartnerMarginConfig | undefined> {
    const exact = await this.findByScope(partnerId, partnerLocationId, productCategoryId);
    if (exact) return exact;
    if (partnerLocationId === 0) return undefined; // already checked the wildcard above
    return this.findByScope(partnerId, 0, productCategoryId);
  }
}
