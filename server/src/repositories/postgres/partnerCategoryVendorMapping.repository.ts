import { getSql } from '../../db/postgres';
import { PartnerCategoryVendorMapping } from '../../types/domain';
import { PartnerCategoryVendorMappingRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const mappings = new EntityTable<PartnerCategoryVendorMapping>(
  'partner_category_vendor_mapping',
  'Partner category vendor mapping',
  (row) => ({
    ...mapBaseEntity(row),
    partnerLocationId: toNum(row.partner_location_id),
    productCategoryId: toNum(row.product_category_id),
    vendorId: toNum(row.vendor_id),
  }),
  (m) => ({
    ...baseEntityColumns(m),
    partner_location_id: m.partnerLocationId,
    product_category_id: m.productCategoryId,
    vendor_id: m.vendorId,
  }),
);

export class PostgresPartnerCategoryVendorMappingRepository implements PartnerCategoryVendorMappingRepository {
  async create(mapping: PartnerCategoryVendorMapping): Promise<PartnerCategoryVendorMapping> {
    return mappings.insert(mapping);
  }

  async update(id: number, patch: Partial<PartnerCategoryVendorMapping>): Promise<PartnerCategoryVendorMapping> {
    return mappings.update(id, patch);
  }

  async findById(id: number): Promise<PartnerCategoryVendorMapping | undefined> {
    return mappings.get(id);
  }

  async list(filter?: {
    partnerLocationId?: number;
    productCategoryId?: number;
    vendorId?: number;
    isActive?: boolean;
  }): Promise<PartnerCategoryVendorMapping[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partner_category_vendor_mapping
      WHERE true
      ${filter?.partnerLocationId !== undefined ? sql`AND partner_location_id = ${filter.partnerLocationId}` : sql``}
      ${filter?.productCategoryId !== undefined ? sql`AND product_category_id = ${filter.productCategoryId}` : sql``}
      ${filter?.vendorId !== undefined ? sql`AND vendor_id = ${filter.vendorId}` : sql``}
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return mappings.mapRows(rows);
  }

  async listVendorsFor(partnerLocationId: number, productCategoryId: number): Promise<PartnerCategoryVendorMapping[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partner_category_vendor_mapping
      WHERE partner_location_id = ${partnerLocationId}
        AND product_category_id = ${productCategoryId}
        AND is_active = true
      ORDER BY id
    `;
    return mappings.mapRows(rows);
  }
}
