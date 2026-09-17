import { Partner, PartnerType } from '../../types/domain';
import { PartnerRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryPartnerRepository implements PartnerRepository {
  async create(partner: Partner): Promise<Partner> {
    tables.partners.set(partner.id, partner);
    return partner;
  }

  async update(id: number, patch: Partial<Partner>): Promise<Partner> {
    const existing = tables.partners.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Partner ${id} not found`), { status: 404 });
    }
    const updated: Partner = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.partners.set(id, updated);
    return updated;
  }

  async findById(id: number): Promise<Partner | undefined> {
    return tables.partners.get(id);
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<Partner | undefined> {
    return Array.from(tables.partners.values()).find((p) => p.uniqueIdentifier === uniqueIdentifier);
  }

  async list(filter?: { isActive?: boolean; partnerType?: PartnerType }): Promise<Partner[]> {
    let result = Array.from(tables.partners.values());
    if (filter?.isActive !== undefined) result = result.filter((p) => p.isActive === filter.isActive);
    if (filter?.partnerType !== undefined) result = result.filter((p) => p.partnerType === filter.partnerType);
    return result;
  }
}
