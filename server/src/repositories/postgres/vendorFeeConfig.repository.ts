import { getSql } from '../../db/postgres';
import { VendorFeeConfig } from '../../types/domain';
import { VendorFeeConfigRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const configs = new EntityTable<VendorFeeConfig>(
  'vendor_fee_config',
  'Vendor fee config',
  (row) => ({
    ...mapBaseEntity(row),
    vendorId: toNum(row.vendor_id),
    productCategoryId: toNum(row.product_category_id),
    feeAmount: toNum(row.fee_amount),
  }),
  (c) => ({
    ...baseEntityColumns(c),
    vendor_id: c.vendorId,
    product_category_id: c.productCategoryId,
    fee_amount: c.feeAmount,
  }),
);

export class PostgresVendorFeeConfigRepository implements VendorFeeConfigRepository {
  async create(config: VendorFeeConfig): Promise<VendorFeeConfig> {
    return configs.insert(config);
  }

  async update(id: number, patch: Partial<VendorFeeConfig>): Promise<VendorFeeConfig> {
    return configs.update(id, patch);
  }

  async findById(id: number): Promise<VendorFeeConfig | undefined> {
    return configs.get(id);
  }

  async findByScope(vendorId: number, productCategoryId: number): Promise<VendorFeeConfig | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM vendor_fee_config
      WHERE vendor_id = ${vendorId} AND product_category_id = ${productCategoryId} AND is_active = true
      ORDER BY id
      LIMIT 1
    `;
    return rows[0] ? configs.fromRow(rows[0]) : undefined;
  }

  async list(filter?: {
    vendorId?: number;
    productCategoryId?: number;
    isActive?: boolean;
  }): Promise<VendorFeeConfig[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM vendor_fee_config
      WHERE true
      ${filter?.vendorId !== undefined ? sql`AND vendor_id = ${filter.vendorId}` : sql``}
      ${filter?.productCategoryId !== undefined ? sql`AND product_category_id = ${filter.productCategoryId}` : sql``}
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return configs.mapRows(rows);
  }

  async resolve(vendorId: number, productCategoryId: number): Promise<VendorFeeConfig | undefined> {
    return this.findByScope(vendorId, productCategoryId);
  }
}
