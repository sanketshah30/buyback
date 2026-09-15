import { PartnerLocation } from '../../types/domain';
import { PartnerLocationRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryPartnerLocationRepository implements PartnerLocationRepository {
  async create(location: PartnerLocation): Promise<PartnerLocation> {
    tables.partnerLocations.set(location.id, location);
    return location;
  }

  async update(id: string, patch: Partial<PartnerLocation>): Promise<PartnerLocation> {
    const existing = tables.partnerLocations.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Partner location ${id} not found`), { status: 404 });
    }
    const updated: PartnerLocation = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.partnerLocations.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<PartnerLocation | undefined> {
    return tables.partnerLocations.get(id);
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<PartnerLocation | undefined> {
    return Array.from(tables.partnerLocations.values()).find((l) => l.uniqueIdentifier === uniqueIdentifier);
  }

  async listByPartner(partnerId: string): Promise<PartnerLocation[]> {
    return Array.from(tables.partnerLocations.values()).filter((l) => l.partnerId === partnerId);
  }

  async list(filter?: { isActive?: boolean }): Promise<PartnerLocation[]> {
    let result = Array.from(tables.partnerLocations.values());
    if (filter?.isActive !== undefined) result = result.filter((l) => l.isActive === filter.isActive);
    return result;
  }
}
