import { PartnerCategoryVendorMapping } from '../../types/domain';
import { PartnerCategoryVendorMappingRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<PartnerCategoryVendorMapping>('partner_category_vendor_mappings');

export class PostgresPartnerCategoryVendorMappingRepository implements PartnerCategoryVendorMappingRepository {
  async create(mapping: PartnerCategoryVendorMapping): Promise<PartnerCategoryVendorMapping> {
    return store.insert(mapping);
  }

  async update(id: number, patch: Partial<PartnerCategoryVendorMapping>): Promise<PartnerCategoryVendorMapping> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Partner category vendor mapping', id);
    const updated: PartnerCategoryVendorMapping = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<PartnerCategoryVendorMapping | undefined> {
    return store.get(id);
  }

  async list(filter?: {
    partnerLocationId?: number;
    productCategoryId?: number;
    vendorId?: number;
    isActive?: boolean;
  }): Promise<PartnerCategoryVendorMapping[]> {
    let result: PartnerCategoryVendorMapping[];
    if (filter?.partnerLocationId !== undefined && filter?.productCategoryId !== undefined) {
      result = await store.findByJsonIntPair(
        'partnerLocationId',
        filter.partnerLocationId,
        'productCategoryId',
        filter.productCategoryId,
      );
    } else if (filter?.partnerLocationId !== undefined) {
      result = await store.findByJsonInt('partnerLocationId', filter.partnerLocationId);
    } else if (filter?.productCategoryId !== undefined) {
      result = await store.findByJsonInt('productCategoryId', filter.productCategoryId);
    } else if (filter?.vendorId !== undefined) {
      result = await store.findByJsonInt('vendorId', filter.vendorId);
    } else {
      result = await store.listAll();
    }
    if (filter?.vendorId !== undefined) result = result.filter((m) => m.vendorId === filter.vendorId);
    if (filter?.isActive !== undefined) result = result.filter((m) => m.isActive === filter.isActive);
    return result;
  }

  async listVendorsFor(partnerLocationId: number, productCategoryId: number): Promise<PartnerCategoryVendorMapping[]> {
    return (
      await store.findByJsonIntPair('partnerLocationId', partnerLocationId, 'productCategoryId', productCategoryId)
    ).filter((m) => m.isActive);
  }
}
