import { getSql } from '../../db/postgres';
import { Partner, PartnerType } from '../../types/domain';
import { PartnerRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toStrOrUndefined } from './helpers';

function fromRow(row: SqlRow): Partner {
  return {
    ...mapBaseEntity(row),
    name: String(row.name),
    address: String(row.address),
    city: String(row.city),
    state: String(row.state),
    zipCode: String(row.zip_code),
    country: String(row.country),
    partnerType: row.partner_type as PartnerType,
    uniqueIdentifier: String(row.unique_identifier),
    email: toStrOrUndefined(row.email),
  };
}

function toRow(p: Partner): SqlRow {
  return {
    ...baseEntityColumns(p),
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    zip_code: p.zipCode,
    country: p.country,
    partner_type: p.partnerType,
    unique_identifier: p.uniqueIdentifier,
    email: p.email,
  };
}

const partners = new EntityTable<Partner>('partners', 'Partner', fromRow, toRow);

export class PostgresPartnerRepository implements PartnerRepository {
  async create(partner: Partner): Promise<Partner> {
    return partners.insert(partner);
  }

  async update(id: number, patch: Partial<Partner>): Promise<Partner> {
    return partners.update(id, patch);
  }

  async findById(id: number): Promise<Partner | undefined> {
    return partners.get(id);
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<Partner | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partners WHERE unique_identifier = ${uniqueIdentifier} ORDER BY is_active DESC, id LIMIT 1
    `;
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async list(filter?: { isActive?: boolean; partnerType?: PartnerType }): Promise<Partner[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partners
      WHERE true
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ${filter?.partnerType !== undefined ? sql`AND partner_type = ${filter.partnerType}` : sql``}
      ORDER BY id
    `;
    return partners.mapRows(rows);
  }
}
