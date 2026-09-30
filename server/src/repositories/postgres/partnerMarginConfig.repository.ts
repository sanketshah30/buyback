import { PartnerMarginConfig } from '../../types/domain';
import { PartnerMarginConfigRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<PartnerMarginConfig>('partner_margin_configs');

export class PostgresPartnerMarginConfigRepository implements PartnerMarginConfigRepository {
  async create(config: PartnerMarginConfig): Promise<PartnerMarginConfig> {
    return store.insert(config);
  }

  async update(id: number, patch: Partial<PartnerMarginConfig>): Promise<PartnerMarginConfig> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Partner margin config', id);
    const updated: PartnerMarginConfig = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<PartnerMarginConfig | undefined> {
    return store.get(id);
  }

  async findByScope(
    partnerId: number,
    partnerLocationId: number,
    productCategoryId: number,
  ): Promise<PartnerMarginConfig | undefined> {
    const rows = await store.findByJsonInt('partnerId', partnerId);
    return rows.find(
      (c) =>
        c.isActive &&
        c.partnerLocationId === partnerLocationId &&
        c.productCategoryId === productCategoryId,
    );
  }

  async list(filter?: {
    partnerId?: number;
    partnerLocationId?: number;
    productCategoryId?: number;
    isActive?: boolean;
  }): Promise<PartnerMarginConfig[]> {
    let result = await store.listAll();
    if (filter?.partnerId !== undefined) result = result.filter((c) => c.partnerId === filter.partnerId);
    if (filter?.partnerLocationId !== undefined) {
      result = result.filter((c) => c.partnerLocationId === filter.partnerLocationId);
    }
    if (filter?.productCategoryId !== undefined) {
      result = result.filter((c) => c.productCategoryId === filter.productCategoryId);
    }
    if (filter?.isActive !== undefined) result = result.filter((c) => c.isActive === filter.isActive);
    return result;
  }

  async resolve(
    partnerId: number,
    partnerLocationId: number,
    productCategoryId: number,
  ): Promise<PartnerMarginConfig | undefined> {
    const exact = await this.findByScope(partnerId, partnerLocationId, productCategoryId);
    if (exact) return exact;
    if (partnerLocationId === 0) return undefined;
    return this.findByScope(partnerId, 0, productCategoryId);
  }
}
