import { getSql } from '../../db/postgres';
import { DepreciationConfig } from '../../types/domain';
import { DepreciationConfigRepository } from '../interfaces';
import {
  EntityTable,
  SqlRow,
  baseEntityColumns,
  mapBaseEntity,
  toIso,
  toIsoOrUndefined,
  toNum,
  toNumOrNull,
} from './helpers';

const configs = new EntityTable<DepreciationConfig>(
  'depreciation_config',
  'Depreciation config',
  (row) => ({
    ...mapBaseEntity(row),
    productCategoryId: toNum(row.product_category_id),
    brandId: toNum(row.brand_id),
    vendorId: toNumOrNull(row.vendor_id),
    validFrom: toIso(row.valid_from),
    validTo: toIsoOrUndefined(row.valid_to),
    uploadedById: toNum(row.uploaded_by_id),
  }),
  (c) => ({
    ...baseEntityColumns(c),
    product_category_id: c.productCategoryId,
    brand_id: c.brandId,
    vendor_id: c.vendorId,
    valid_from: c.validFrom,
    valid_to: c.validTo,
    uploaded_by_id: c.uploadedById,
  }),
);

export class PostgresDepreciationConfigRepository implements DepreciationConfigRepository {
  async create(config: DepreciationConfig): Promise<DepreciationConfig> {
    return configs.insert(config);
  }

  async update(id: number, patch: Partial<DepreciationConfig>): Promise<DepreciationConfig> {
    return configs.update(id, patch);
  }

  async findById(id: number): Promise<DepreciationConfig | undefined> {
    return configs.get(id);
  }

  async list(filter?: {
    productCategoryId?: number;
    brandId?: number;
    vendorId?: number | null;
    isActive?: boolean;
  }): Promise<DepreciationConfig[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM depreciation_config
      WHERE true
      ${filter?.productCategoryId !== undefined ? sql`AND product_category_id = ${filter.productCategoryId}` : sql``}
      ${filter?.brandId !== undefined ? sql`AND brand_id = ${filter.brandId}` : sql``}
      ${
        filter?.vendorId === undefined
          ? sql``
          : filter.vendorId === null
            ? sql`AND vendor_id IS NULL`
            : sql`AND vendor_id = ${filter.vendorId}`
      }
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return configs.mapRows(rows);
  }

  async findActive(
    productCategoryId: number,
    brandId: number,
    vendorId: number | null,
  ): Promise<DepreciationConfig | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM depreciation_config
      WHERE product_category_id = ${productCategoryId}
        AND brand_id = ${brandId}
        AND ${vendorId === null ? sql`vendor_id IS NULL` : sql`vendor_id = ${vendorId}`}
        AND is_active = true
        AND valid_to IS NULL
      ORDER BY id
      LIMIT 1
    `;
    return rows[0] ? configs.fromRow(rows[0]) : undefined;
  }
}
