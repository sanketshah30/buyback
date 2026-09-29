import { SkuPricing } from '../../types/domain';
import { SkuPricingRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

function profileKey(vendorId: number, skuId: number): string {
  return `${vendorId}:${skuId}`;
}

export class InMemorySkuPricingRepository implements SkuPricingRepository {
  async create(pricing: SkuPricing): Promise<SkuPricing> {
    tables.skuPricing.set(pricing.id, pricing);
    addToIndex(indexes.skuPricingByVendorId, pricing.vendorId, pricing.id);
    addToIndex(indexes.skuPricingBySkuId, pricing.skuId, pricing.id);
    addToIndex(indexes.skuPricingByVendorSku, profileKey(pricing.vendorId, pricing.skuId), pricing.id);
    return pricing;
  }

  async update(id: number, patch: Partial<SkuPricing>): Promise<SkuPricing> {
    const existing = tables.skuPricing.get(id);
    if (!existing) {
      throw Object.assign(new Error(`SKU pricing ${id} not found`), { status: 404 });
    }
    const updated: SkuPricing = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.skuPricing.set(id, updated);

    const vendorChanged = patch.vendorId !== undefined && patch.vendorId !== existing.vendorId;
    const skuChanged = patch.skuId !== undefined && patch.skuId !== existing.skuId;
    if (vendorChanged) {
      removeFromIndex(indexes.skuPricingByVendorId, existing.vendorId, id);
      addToIndex(indexes.skuPricingByVendorId, updated.vendorId, id);
    }
    if (skuChanged) {
      removeFromIndex(indexes.skuPricingBySkuId, existing.skuId, id);
      addToIndex(indexes.skuPricingBySkuId, updated.skuId, id);
    }
    if (vendorChanged || skuChanged) {
      removeFromIndex(indexes.skuPricingByVendorSku, profileKey(existing.vendorId, existing.skuId), id);
      addToIndex(indexes.skuPricingByVendorSku, profileKey(updated.vendorId, updated.skuId), id);
    }
    return updated;
  }

  async findById(id: number): Promise<SkuPricing | undefined> {
    return tables.skuPricing.get(id);
  }

  async list(filter?: { vendorId?: number; skuId?: number; isActive?: boolean }): Promise<SkuPricing[]> {
    let result: SkuPricing[];
    if (filter?.vendorId !== undefined && filter?.skuId !== undefined) {
      result = getIndexed(indexes.skuPricingByVendorSku, profileKey(filter.vendorId, filter.skuId), tables.skuPricing);
    } else if (filter?.vendorId !== undefined) {
      result = getIndexed(indexes.skuPricingByVendorId, filter.vendorId, tables.skuPricing);
    } else if (filter?.skuId !== undefined) {
      result = getIndexed(indexes.skuPricingBySkuId, filter.skuId, tables.skuPricing);
    } else {
      result = Array.from(tables.skuPricing.values());
    }
    if (filter?.isActive !== undefined) result = result.filter((p) => p.isActive === filter.isActive);
    return result;
  }

  async listForVendorSku(vendorId: number, skuId: number): Promise<SkuPricing[]> {
    return getIndexed(indexes.skuPricingByVendorSku, profileKey(vendorId, skuId), tables.skuPricing).filter((p) => p.isActive);
  }
}
