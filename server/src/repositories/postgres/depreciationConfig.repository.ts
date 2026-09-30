import { getSql } from '../../db/postgres';
import { DepreciationConfig } from '../../types/domain';
import { DepreciationConfigRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<DepreciationConfig>('depreciation_configs');

function vendorKey(vendorId: number | null): string {
  return vendorId === null ? 'null' : String(vendorId);
}

export class PostgresDepreciationConfigRepository implements DepreciationConfigRepository {
  async create(config: DepreciationConfig): Promise<DepreciationConfig> {
    return store.insert(config);
  }

  async update(id: number, patch: Partial<DepreciationConfig>): Promise<DepreciationConfig> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Depreciation config', id);
    const updated: DepreciationConfig = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<DepreciationConfig | undefined> {
    return store.get(id);
  }

  async list(filter?: {
    productCategoryId?: number;
    brandId?: number;
    vendorId?: number | null;
    isActive?: boolean;
  }): Promise<DepreciationConfig[]> {
    let result: DepreciationConfig[];
    if (filter?.productCategoryId !== undefined) {
      result = await store.findByJsonInt('productCategoryId', filter.productCategoryId);
    } else if (filter?.brandId !== undefined) {
      result = await store.findByJsonInt('brandId', filter.brandId);
    } else {
      result = await store.listAll();
    }
    if (filter?.brandId !== undefined) result = result.filter((c) => c.brandId === filter.brandId);
    if (filter?.vendorId !== undefined) result = result.filter((c) => c.vendorId === filter.vendorId);
    if (filter?.isActive !== undefined) result = result.filter((c) => c.isActive === filter.isActive);
    return result;
  }

  async findActive(
    productCategoryId: number,
    brandId: number,
    vendorId: number | null,
  ): Promise<DepreciationConfig | undefined> {
    const sql = getSql();
    const rows = await sql<{ data: DepreciationConfig }[]>`
      SELECT data FROM depreciation_configs
      WHERE (data->>'productCategoryId')::bigint = ${productCategoryId}
        AND (data->>'brandId')::bigint = ${brandId}
        AND COALESCE(data->>'vendorId', 'null') = ${vendorKey(vendorId)}
        AND (data->>'isActive')::boolean = true
        AND COALESCE(data->>'validTo', '') = ''
      LIMIT 1
    `;
    return rows[0]?.data;
  }
}
