import { getSql } from '../../db/postgres';
import { UserRole } from '../../types/domain';
import { allocateId } from '../../utils/idGenerator';
import { UserRoleRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const userRoles = new EntityTable<UserRole>(
  'user_roles',
  'User role',
  (row) => ({
    ...mapBaseEntity(row),
    userId: toNum(row.user_id),
    roleId: toNum(row.role_id),
  }),
  (ur) => ({ ...baseEntityColumns(ur), user_id: ur.userId, role_id: ur.roleId }),
);

export class PostgresUserRoleRepository implements UserRoleRepository {
  async assign(userRole: UserRole): Promise<UserRole> {
    const record: UserRole = userRole.id ? userRole : { ...userRole, id: await allocateId('user_roles') };
    return userRoles.insert(record);
  }

  async revoke(userId: number, roleId: number): Promise<void> {
    const sql = getSql();
    await sql`
      UPDATE user_roles
      SET is_active = false, updated_at = now()
      WHERE user_id = ${userId} AND role_id = ${roleId} AND is_active = true
    `;
  }

  async listByUser(userId: number): Promise<UserRole[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM user_roles WHERE user_id = ${userId} AND is_active = true ORDER BY id
    `;
    return userRoles.mapRows(rows);
  }

  async findActive(userId: number, roleId: number): Promise<UserRole | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM user_roles
      WHERE user_id = ${userId} AND role_id = ${roleId} AND is_active = true
      ORDER BY id
      LIMIT 1
    `;
    return rows[0] ? userRoles.fromRow(rows[0]) : undefined;
  }
}
