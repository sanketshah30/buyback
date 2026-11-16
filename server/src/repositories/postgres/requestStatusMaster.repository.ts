import { getSql } from '../../db/postgres';
import { RequestStatusMaster } from '../../types/domain';
import { RequestStatusMasterRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const statuses = new EntityTable<RequestStatusMaster>(
  'request_status_master',
  'Request status',
  (row) => ({
    ...mapBaseEntity(row),
    name: String(row.name),
    sequence: toNum(row.sequence),
  }),
  (s) => ({ ...baseEntityColumns(s), name: s.name, sequence: s.sequence }),
);

export class PostgresRequestStatusMasterRepository implements RequestStatusMasterRepository {
  async list(filter?: { isActive?: boolean }): Promise<RequestStatusMaster[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM request_status_master
      WHERE true
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY sequence, id
    `;
    return statuses.mapRows(rows);
  }

  async findById(id: number): Promise<RequestStatusMaster | undefined> {
    return statuses.get(id);
  }

  async findByName(name: string): Promise<RequestStatusMaster | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM request_status_master WHERE name = ${name} ORDER BY is_active DESC, id LIMIT 1
    `;
    return rows[0] ? statuses.fromRow(rows[0]) : undefined;
  }
}
