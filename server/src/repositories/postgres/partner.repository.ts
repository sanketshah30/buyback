import { Partner, PartnerType } from '../../types/domain';
import { PartnerRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<Partner>('partners');

export class PostgresPartnerRepository implements PartnerRepository {
  async create(partner: Partner): Promise<Partner> {
    return store.insert(partner);
  }

  async update(id: number, patch: Partial<Partner>): Promise<Partner> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Partner', id);
    const updated: Partner = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<Partner | undefined> {
    return store.get(id);
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<Partner | undefined> {
    return store.findByJsonText('uniqueIdentifier', uniqueIdentifier);
  }

  async list(filter?: { isActive?: boolean; partnerType?: PartnerType }): Promise<Partner[]> {
    let result = await store.listAll();
    if (filter?.isActive !== undefined) result = result.filter((p) => p.isActive === filter.isActive);
    if (filter?.partnerType !== undefined) result = result.filter((p) => p.partnerType === filter.partnerType);
    return result;
  }
}
