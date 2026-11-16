import { getSql } from '../../db/postgres';
import { PartnerLocation } from '../../types/domain';
import { PartnerLocationRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum, toStrOrUndefined } from './helpers';

function fromRow(row: SqlRow): PartnerLocation {
  return {
    ...mapBaseEntity(row),
    partnerId: toNum(row.partner_id),
    name: String(row.name),
    address: String(row.address),
    city: String(row.city),
    state: String(row.state),
    zipCode: String(row.zip_code),
    country: String(row.country),
    uniqueIdentifier: String(row.unique_identifier),
    email: toStrOrUndefined(row.email),
  };
}

function toRow(l: PartnerLocation): SqlRow {
  return {
    ...baseEntityColumns(l),
    partner_id: l.partnerId,
    name: l.name,
    address: l.address,
    city: l.city,
    state: l.state,
    zip_code: l.zipCode,
    country: l.country,
    unique_identifier: l.uniqueIdentifier,
    email: l.email,
  };
}

const locations = new EntityTable<PartnerLocation>('partner_locations', 'Partner location', fromRow, toRow);

export class PostgresPartnerLocationRepository implements PartnerLocationRepository {
  async create(location: PartnerLocation): Promise<PartnerLocation> {
    return locations.insert(location);
  }

  async update(id: number, patch: Partial<PartnerLocation>): Promise<PartnerLocation> {
    return locations.update(id, patch);
  }

  async findById(id: number): Promise<PartnerLocation | undefined> {
    return locations.get(id);
  }

  async findByUniqueIdentifier(uniqueIdentifier: string): Promise<PartnerLocation | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partner_locations
      WHERE unique_identifier = ${uniqueIdentifier}
      ORDER BY is_active DESC, id
      LIMIT 1
    `;
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async listByPartner(partnerId: number): Promise<PartnerLocation[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partner_locations WHERE partner_id = ${partnerId} ORDER BY id
    `;
    return locations.mapRows(rows);
  }

  async list(filter?: { isActive?: boolean }): Promise<PartnerLocation[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM partner_locations
      WHERE true
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return locations.mapRows(rows);
  }
}
