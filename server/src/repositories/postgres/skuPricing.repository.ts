import { getSql } from '../../db/postgres';
import { SkuPricing } from '../../types/domain';
import { SkuPricingRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toIso, toIsoOrUndefined, toNum } from './helpers';

const pricing = new EntityTable<SkuPricing>(
  'sku_pricing',
  'SKU pricing',
  (row) => ({
    ...mapBaseEntity(row),
    vendorId: toNum(row.vendor_id),
    skuId: toNum(row.sku_id),
    price: toNum(row.price),
    validFrom: toIso(row.valid_from),
    validTo: toIsoOrUndefined(row.valid_to),
    uploadedById: toNum(row.uploaded_by_id),
  }),
  (p) => ({
    ...baseEntityColumns(p),
    vendor_id: p.vendorId,
    sku_id: p.skuId,
    price: p.price,
    valid_from: p.validFrom,
    valid_to: p.validTo,
    uploaded_by_id: p.uploadedById,
  }),
);

export class PostgresSkuPricingRepository implements SkuPricingRepository {
  async create(row: SkuPricing): Promise<SkuPricing> {
    return pricing.insert(row);
  }

  async update(id: number, patch: Partial<SkuPricing>): Promise<SkuPricing> {
    return pricing.update(id, patch);
  }

  async findById(id: number): Promise<SkuPricing | undefined> {
    return pricing.get(id);
  }

  async list(filter?: { vendorId?: number; skuId?: number; isActive?: boolean }): Promise<SkuPricing[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM sku_pricing
      WHERE true
      ${filter?.vendorId !== undefined ? sql`AND vendor_id = ${filter.vendorId}` : sql``}
      ${filter?.skuId !== undefined ? sql`AND sku_id = ${filter.skuId}` : sql``}
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return pricing.mapRows(rows);
  }

  async listForVendorSku(vendorId: number, skuId: number): Promise<SkuPricing[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM sku_pricing
      WHERE vendor_id = ${vendorId} AND sku_id = ${skuId} AND is_active = true
      ORDER BY id
    `;
    return pricing.mapRows(rows);
  }
}
