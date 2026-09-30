import { VendorFeeConfig } from '../../types/domain';
import { VendorFeeConfigRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<VendorFeeConfig>('vendor_fee_configs');

export class PostgresVendorFeeConfigRepository implements VendorFeeConfigRepository {
  async create(config: VendorFeeConfig): Promise<VendorFeeConfig> {
    return store.insert(config);
  }

  async update(id: number, patch: Partial<VendorFeeConfig>): Promise<VendorFeeConfig> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Vendor fee config', id);
    const updated: VendorFeeConfig = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<VendorFeeConfig | undefined> {
    return store.get(id);
  }

  async findByScope(vendorId: number, productCategoryId: number): Promise<VendorFeeConfig | undefined> {
    return (await store.findByJsonIntPair('vendorId', vendorId, 'productCategoryId', productCategoryId)).find(
      (c) => c.isActive,
    );
  }

  async list(filter?: {
    vendorId?: number;
    productCategoryId?: number;
    isActive?: boolean;
  }): Promise<VendorFeeConfig[]> {
    let result = await store.listAll();
    if (filter?.vendorId !== undefined) result = result.filter((c) => c.vendorId === filter.vendorId);
    if (filter?.productCategoryId !== undefined) {
      result = result.filter((c) => c.productCategoryId === filter.productCategoryId);
    }
    if (filter?.isActive !== undefined) result = result.filter((c) => c.isActive === filter.isActive);
    return result;
  }

  async resolve(vendorId: number, productCategoryId: number): Promise<VendorFeeConfig | undefined> {
    return this.findByScope(vendorId, productCategoryId);
  }
}
