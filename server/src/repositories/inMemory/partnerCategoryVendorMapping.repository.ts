import { PartnerCategoryVendorMapping } from '../../types/domain';
import { PartnerCategoryVendorMappingRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

function profileKey(partnerId: number, productCategoryId: number): string {
  return `${partnerId}:${productCategoryId}`;
}

export class InMemoryPartnerCategoryVendorMappingRepository implements PartnerCategoryVendorMappingRepository {
  async create(mapping: PartnerCategoryVendorMapping): Promise<PartnerCategoryVendorMapping> {
    tables.partnerCategoryVendorMappings.set(mapping.id, mapping);
    addToIndex(indexes.partnerCategoryVendorMappingsByPartnerId, mapping.partnerId, mapping.id);
    addToIndex(indexes.partnerCategoryVendorMappingsByCategoryId, mapping.productCategoryId, mapping.id);
    addToIndex(indexes.partnerCategoryVendorMappingsByVendorId, mapping.vendorId, mapping.id);
    addToIndex(indexes.partnerCategoryVendorMappingsByPartnerCategory, profileKey(mapping.partnerId, mapping.productCategoryId), mapping.id);
    return mapping;
  }

  async update(id: number, patch: Partial<PartnerCategoryVendorMapping>): Promise<PartnerCategoryVendorMapping> {
    const existing = tables.partnerCategoryVendorMappings.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Partner-category-vendor mapping ${id} not found`), { status: 404 });
    }
    const updated: PartnerCategoryVendorMapping = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.partnerCategoryVendorMappings.set(id, updated);

    const partnerChanged = patch.partnerId !== undefined && patch.partnerId !== existing.partnerId;
    const categoryChanged = patch.productCategoryId !== undefined && patch.productCategoryId !== existing.productCategoryId;
    const vendorChanged = patch.vendorId !== undefined && patch.vendorId !== existing.vendorId;
    if (partnerChanged) {
      removeFromIndex(indexes.partnerCategoryVendorMappingsByPartnerId, existing.partnerId, id);
      addToIndex(indexes.partnerCategoryVendorMappingsByPartnerId, updated.partnerId, id);
    }
    if (categoryChanged) {
      removeFromIndex(indexes.partnerCategoryVendorMappingsByCategoryId, existing.productCategoryId, id);
      addToIndex(indexes.partnerCategoryVendorMappingsByCategoryId, updated.productCategoryId, id);
    }
    if (vendorChanged) {
      removeFromIndex(indexes.partnerCategoryVendorMappingsByVendorId, existing.vendorId, id);
      addToIndex(indexes.partnerCategoryVendorMappingsByVendorId, updated.vendorId, id);
    }
    if (partnerChanged || categoryChanged) {
      removeFromIndex(indexes.partnerCategoryVendorMappingsByPartnerCategory, profileKey(existing.partnerId, existing.productCategoryId), id);
      addToIndex(indexes.partnerCategoryVendorMappingsByPartnerCategory, profileKey(updated.partnerId, updated.productCategoryId), id);
    }
    return updated;
  }

  async findById(id: number): Promise<PartnerCategoryVendorMapping | undefined> {
    return tables.partnerCategoryVendorMappings.get(id);
  }

  async list(filter?: {
    partnerId?: number;
    productCategoryId?: number;
    vendorId?: number;
    isActive?: boolean;
  }): Promise<PartnerCategoryVendorMapping[]> {
    let result: PartnerCategoryVendorMapping[];
    if (filter?.partnerId !== undefined && filter?.productCategoryId !== undefined) {
      result = getIndexed(indexes.partnerCategoryVendorMappingsByPartnerCategory, profileKey(filter.partnerId, filter.productCategoryId), tables.partnerCategoryVendorMappings);
    } else if (filter?.partnerId !== undefined) {
      result = getIndexed(indexes.partnerCategoryVendorMappingsByPartnerId, filter.partnerId, tables.partnerCategoryVendorMappings);
    } else if (filter?.productCategoryId !== undefined) {
      result = getIndexed(indexes.partnerCategoryVendorMappingsByCategoryId, filter.productCategoryId, tables.partnerCategoryVendorMappings);
    } else if (filter?.vendorId !== undefined) {
      result = getIndexed(indexes.partnerCategoryVendorMappingsByVendorId, filter.vendorId, tables.partnerCategoryVendorMappings);
    } else {
      result = Array.from(tables.partnerCategoryVendorMappings.values());
    }
    if (filter?.vendorId !== undefined) result = result.filter((m) => m.vendorId === filter.vendorId);
    if (filter?.isActive !== undefined) result = result.filter((m) => m.isActive === filter.isActive);
    return result;
  }

  async listVendorsFor(partnerId: number, productCategoryId: number): Promise<PartnerCategoryVendorMapping[]> {
    return getIndexed(indexes.partnerCategoryVendorMappingsByPartnerCategory, profileKey(partnerId, productCategoryId), tables.partnerCategoryVendorMappings).filter(
      (m) => m.isActive,
    );
  }
}
