import { getSql } from '../../db/postgres';
import { Session } from '../../types/domain';
import { SessionRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toIso, toIsoOrUndefined, toNum } from './helpers';

function fromRow(row: SqlRow): Session {
  return {
    ...mapBaseEntity(row),
    userId: toNum(row.user_id),
    token: String(row.token),
    expiresAt: toIso(row.expires_at),
    revokedAt: toIsoOrUndefined(row.revoked_at),
  };
}

function toRow(session: Session): SqlRow {
  return {
    ...baseEntityColumns(session),
    user_id: session.userId,
    token: session.token,
    expires_at: session.expiresAt,
    revoked_at: session.revokedAt,
  };
}

const sessions = new EntityTable<Session>('sessions', 'Session', fromRow, toRow);

export class PostgresSessionRepository implements SessionRepository {
  async create(session: Session): Promise<Session> {
    return sessions.insert(session);
  }

  async findByToken(token: string): Promise<Session | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM sessions WHERE token = ${token} LIMIT 1`;
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async revoke(token: string): Promise<void> {
    const sql = getSql();
    await sql`
      UPDATE sessions
      SET revoked_at = now(), updated_at = now()
      WHERE token = ${token} AND revoked_at IS NULL
    `;
  }

  async listByUser(userId: number): Promise<Session[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM sessions WHERE user_id = ${userId} ORDER BY created_at DESC, id DESC
    `;
    return sessions.mapRows(rows);
  }
}
