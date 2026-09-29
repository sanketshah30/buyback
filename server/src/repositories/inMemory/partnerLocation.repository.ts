import { PartnerLocation } from '../../types/domain';
import { PartnerLocationRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

export class InMemoryPartnerLocationRepository implements PartnerLocationRepository {
  async create(location: PartnerLocation): Promise<PartnerLocation> {
    tables.partnerLocations.set(location.id, location);
    addToIndex(indexes.partnerLocationsByPartnerId, location.partnerId, location.id);
    return location;
  }

  async update(id: number, patch: Partial<PartnerLocation>): Promise<PartnerLocation> {
    const existing = tables.partnerLocations.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Partner location ${id} not found`), { status: 404 });
    }
    const updated: PartnerLocation = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.partnerLocations.set(id, updated);

    if (patch.partnerId !== undefined && patch.partnerId !== existing.partnerId) {
      removeFromIndex(indexes.partnerLocationsByPartnerId, existing.partnerId, id);
      addToIndex(indexes.partnerLocationsByPartnerId, patch.partnerId, id);
    }
    return updated;
  }

  async findById(id: number): Promise<PartnerLocation | undefined> {
    return tables.partnerLocations.get(id);
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<PartnerLocation | undefined> {
    return Array.from(tables.partnerLocations.values()).find((l) => l.uniqueIdentifier === uniqueIdentifier);
  }

  async listByPartner(partnerId: number): Promise<PartnerLocation[]> {
    return getIndexed(indexes.partnerLocationsByPartnerId, partnerId, tables.partnerLocations);
  }

  async list(filter?: { isActive?: boolean }): Promise<PartnerLocation[]> {
    let result = Array.from(tables.partnerLocations.values());
    if (filter?.isActive !== undefined) result = result.filter((l) => l.isActive === filter.isActive);
    return result;
  }
}
