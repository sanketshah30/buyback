import { PartnerLocation } from '../../types/domain';
import { PartnerLocationRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<PartnerLocation>('partner_locations');

export class PostgresPartnerLocationRepository implements PartnerLocationRepository {
  async create(location: PartnerLocation): Promise<PartnerLocation> {
    return store.insert(location);
  }

  async update(id: number, patch: Partial<PartnerLocation>): Promise<PartnerLocation> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Partner location', id);
    const updated: PartnerLocation = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<PartnerLocation | undefined> {
    return store.get(id);
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<PartnerLocation | undefined> {
    return store.findByJsonText('uniqueIdentifier', uniqueIdentifier);
  }

  async listByPartner(partnerId: number): Promise<PartnerLocation[]> {
    return store.findByJsonInt('partnerId', partnerId);
  }

  async list(filter?: { isActive?: boolean }): Promise<PartnerLocation[]> {
    let result = await store.listAll();
    if (filter?.isActive !== undefined) result = result.filter((l) => l.isActive === filter.isActive);
    return result;
  }
}
