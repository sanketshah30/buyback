import { getSql } from '../../db/postgres';
import { User } from '../../types/domain';
import { allocateId } from '../../utils/idGenerator';
import { UserRepository } from '../interfaces';
import {
  EntityTable,
  SqlRow,
  baseEntityColumns,
  mapBaseEntity,
  nowIso,
  toNumOrUndefined,
  toStrOrUndefined,
} from './helpers';

function fromRow(row: SqlRow): User {
  return {
    ...mapBaseEntity(row),
    mobile: String(row.mobile),
    name: toStrOrUndefined(row.name),
    username: toStrOrUndefined(row.username),
    email: toStrOrUndefined(row.email),
    partnerLocationId: toNumOrUndefined(row.partner_location_id),
  };
}

function toRow(user: User): SqlRow {
  return {
    ...baseEntityColumns(user),
    mobile: user.mobile,
    name: user.name,
    username: user.username,
    email: user.email,
    partner_location_id: user.partnerLocationId,
  };
}

const users = new EntityTable<User>('users', 'User', fromRow, toRow);

export class PostgresUserRepository implements UserRepository {
  async findByMobile(mobile: string): Promise<User | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM users WHERE mobile = ${mobile} LIMIT 1`;
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async findById(id: number): Promise<User | undefined> {
    return users.get(id);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async create(
    mobile: string,
    extra?: Partial<Pick<User, 'username' | 'email' | 'name' | 'partnerLocationId'>>,
  ): Promise<User> {
    const now = nowIso();
    const user: User = {
      id: await allocateId('users'),
      mobile,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ...extra,
    };
    return users.insert(user);
  }

  async update(id: number, patch: Partial<User>): Promise<User> {
    return users.update(id, patch);
  }

  async listByLocation(partnerLocationId: number): Promise<User[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM users
      WHERE partner_location_id = ${partnerLocationId} AND is_active = true
      ORDER BY id
    `;
    return users.mapRows(rows);
  }

  async list(filter?: { isActive?: boolean }): Promise<User[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM users
      WHERE true
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return users.mapRows(rows);
  }
}
