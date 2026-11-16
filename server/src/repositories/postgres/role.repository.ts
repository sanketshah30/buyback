import { getSql } from '../../db/postgres';
import { Role } from '../../types/domain';
import { RoleRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity } from './helpers';

/** OID of text[] - explicit so empty arrays serialize correctly. */
const TEXT_ARRAY_OID = 1009;

function fromRow(row: SqlRow): Role {
  return {
    ...mapBaseEntity(row),
    name: String(row.name),
    rights: Array.isArray(row.rights) ? (row.rights as unknown[]).map(String) : [],
  };
}

function toRow(role: Role): SqlRow {
  return {
    ...baseEntityColumns(role),
    name: role.name,
    rights: getSql().array(role.rights ?? [], TEXT_ARRAY_OID),
  };
}

const roles = new EntityTable<Role>('roles', 'Role', fromRow, toRow);

export class PostgresRoleRepository implements RoleRepository {
  async create(role: Role): Promise<Role> {
    return roles.insert(role);
  }

  async update(id: number, patch: Partial<Role>): Promise<Role> {
    return roles.update(id, patch);
  }

  async findById(id: number): Promise<Role | undefined> {
    return roles.get(id);
  }

  async list(filter?: { isActive?: boolean }): Promise<Role[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM roles
      WHERE true
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return roles.mapRows(rows);
  }
}
