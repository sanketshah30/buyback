import { PartnerCategoryVendorMapping } from '../../types/domain';
import { PartnerCategoryVendorMappingRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

function profileKey(partnerLocationId: number, productCategoryId: number): string {
  return `${partnerLocationId}:${productCategoryId}`;
}

export class InMemoryPartnerCategoryVendorMappingRepository implements PartnerCategoryVendorMappingRepository {
  async create(mapping: PartnerCategoryVendorMapping): Promise<PartnerCategoryVendorMapping> {
    tables.partnerCategoryVendorMappings.set(mapping.id, mapping);
    addToIndex(indexes.partnerCategoryVendorMappingsByPartnerLocationId, mapping.partnerLocationId, mapping.id);
    addToIndex(indexes.partnerCategoryVendorMappingsByCategoryId, mapping.productCategoryId, mapping.id);
    addToIndex(indexes.partnerCategoryVendorMappingsByVendorId, mapping.vendorId, mapping.id);
    addToIndex(indexes.partnerCategoryVendorMappingsByLocationCategory, profileKey(mapping.partnerLocationId, mapping.productCategoryId), mapping.id);
    return mapping;
  }

  async update(id: number, patch: Partial<PartnerCategoryVendorMapping>): Promise<PartnerCategoryVendorMapping> {
    const existing = tables.partnerCategoryVendorMappings.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Partner-category-vendor mapping ${id} not found`), { status: 404 });
    }
    const updated: PartnerCategoryVendorMapping = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.partnerCategoryVendorMappings.set(id, updated);

    const locationChanged = patch.partnerLocationId !== undefined && patch.partnerLocationId !== existing.partnerLocationId;
    const categoryChanged = patch.productCategoryId !== undefined && patch.productCategoryId !== existing.productCategoryId;
    const vendorChanged = patch.vendorId !== undefined && patch.vendorId !== existing.vendorId;
    if (locationChanged) {
      removeFromIndex(indexes.partnerCategoryVendorMappingsByPartnerLocationId, existing.partnerLocationId, id);
      addToIndex(indexes.partnerCategoryVendorMappingsByPartnerLocationId, updated.partnerLocationId, id);
    }
    if (categoryChanged) {
      removeFromIndex(indexes.partnerCategoryVendorMappingsByCategoryId, existing.productCategoryId, id);
      addToIndex(indexes.partnerCategoryVendorMappingsByCategoryId, updated.productCategoryId, id);
    }
    if (vendorChanged) {
      removeFromIndex(indexes.partnerCategoryVendorMappingsByVendorId, existing.vendorId, id);
      addToIndex(indexes.partnerCategoryVendorMappingsByVendorId, updated.vendorId, id);
    }
    if (locationChanged || categoryChanged) {
      removeFromIndex(indexes.partnerCategoryVendorMappingsByLocationCategory, profileKey(existing.partnerLocationId, existing.productCategoryId), id);
      addToIndex(indexes.partnerCategoryVendorMappingsByLocationCategory, profileKey(updated.partnerLocationId, updated.productCategoryId), id);
    }
    return updated;
  }

  async findById(id: number): Promise<PartnerCategoryVendorMapping | undefined> {
    return tables.partnerCategoryVendorMappings.get(id);
  }

  async list(filter?: {
    partnerLocationId?: number;
    productCategoryId?: number;
    vendorId?: number;
    isActive?: boolean;
  }): Promise<PartnerCategoryVendorMapping[]> {
    let result: PartnerCategoryVendorMapping[];
    if (filter?.partnerLocationId !== undefined && filter?.productCategoryId !== undefined) {
      result = getIndexed(indexes.partnerCategoryVendorMappingsByLocationCategory, profileKey(filter.partnerLocationId, filter.productCategoryId), tables.partnerCategoryVendorMappings);
    } else if (filter?.partnerLocationId !== undefined) {
      result = getIndexed(indexes.partnerCategoryVendorMappingsByPartnerLocationId, filter.partnerLocationId, tables.partnerCategoryVendorMappings);
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

  async listVendorsFor(partnerLocationId: number, productCategoryId: number): Promise<PartnerCategoryVendorMapping[]> {
    return getIndexed(indexes.partnerCategoryVendorMappingsByLocationCategory, profileKey(partnerLocationId, productCategoryId), tables.partnerCategoryVendorMappings).filter(
      (m) => m.isActive,
    );
  }
}
