import { SkuPricing } from '../../types/domain';
import { SkuPricingRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<SkuPricing>('sku_pricing');

export class PostgresSkuPricingRepository implements SkuPricingRepository {
  async create(pricing: SkuPricing): Promise<SkuPricing> {
    return store.insert(pricing);
  }

  async update(id: number, patch: Partial<SkuPricing>): Promise<SkuPricing> {
    const existing = await store.get(id);
    if (!existing) throw notFound('SKU pricing', id);
    const updated: SkuPricing = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<SkuPricing | undefined> {
    return store.get(id);
  }

  async list(filter?: { vendorId?: number; skuId?: number; isActive?: boolean }): Promise<SkuPricing[]> {
    let result: SkuPricing[];
    if (filter?.vendorId !== undefined && filter?.skuId !== undefined) {
      result = await store.findByJsonIntPair('vendorId', filter.vendorId, 'skuId', filter.skuId);
    } else if (filter?.vendorId !== undefined) {
      result = await store.findByJsonInt('vendorId', filter.vendorId);
    } else if (filter?.skuId !== undefined) {
      result = await store.findByJsonInt('skuId', filter.skuId);
    } else {
      result = await store.listAll();
    }
    if (filter?.isActive !== undefined) result = result.filter((p) => p.isActive === filter.isActive);
    return result;
  }

  async listForVendorSku(vendorId: number, skuId: number): Promise<SkuPricing[]> {
    return (await store.findByJsonIntPair('vendorId', vendorId, 'skuId', skuId)).filter((p) => p.isActive);
  }
}
