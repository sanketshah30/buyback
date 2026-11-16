import { getSql } from '../../db/postgres';
import { PartnerMarginConfig } from '../../types/domain';
import { PartnerMarginConfigRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const configs = new EntityTable<PartnerMarginConfig>(
  'partner_margin_config',
  'Partner margin config',
  (row) => ({
    ...mapBaseEntity(row),
    partnerId: toNum(row.partner_id),
    partnerLocationId: toNum(row.partner_location_id),
    productCategoryId: toNum(row.product_category_id),
    marginPercent: toNum(row.margin_percent),
  }),
  (c) => ({
    ...baseEntityColumns(c),
    partner_id: c.partnerId,
    partner_location_id: c.partnerLocationId,
    product_category_id: c.productCategoryId,
    margin_percent: c.marginPercent,
  }),
);

export class PostgresPartnerMarginConfigRepository implements PartnerMarginConfigRepository {
  async create(config: PartnerMarginConfig): Promise<PartnerMarginConfig> {
    return configs.insert(config);
  }

  async update(id: number, patch: Partial<PartnerMarginConfig>): Promise<PartnerMarginConfig> {
    return configs.update(id, patch);
  }

  async findById(id: number): Promise<PartnerMarginConfig | undefined> {
    return configs.get(id);
  }

  async findByScope(
    partnerId: number,
    partnerLocationId: number,
    productCategoryId: number,
  ): Promise<PartnerMarginConfig | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partner_margin_config
      WHERE partner_id = ${partnerId}
        AND partner_location_id = ${partnerLocationId}
        AND product_category_id = ${productCategoryId}
        AND is_active = true
      ORDER BY id
      LIMIT 1
    `;
    return rows[0] ? configs.fromRow(rows[0]) : undefined;
  }

  async list(filter?: {
    partnerId?: number;
    partnerLocationId?: number;
    productCategoryId?: number;
    isActive?: boolean;
  }): Promise<PartnerMarginConfig[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partner_margin_config
      WHERE true
      ${filter?.partnerId !== undefined ? sql`AND partner_id = ${filter.partnerId}` : sql``}
      ${filter?.partnerLocationId !== undefined ? sql`AND partner_location_id = ${filter.partnerLocationId}` : sql``}
      ${filter?.productCategoryId !== undefined ? sql`AND product_category_id = ${filter.productCategoryId}` : sql``}
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return configs.mapRows(rows);
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
