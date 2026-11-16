import { getSql } from '../../db/postgres';
import { UserLocationHistory } from '../../types/domain';
import { UserLocationHistoryRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum, toNumOrUndefined } from './helpers';

const history = new EntityTable<UserLocationHistory>(
  'user_location_history',
  'User location history',
  (row) => ({
    ...mapBaseEntity(row),
    userId: toNum(row.user_id),
    fromPartnerLocationId: toNumOrUndefined(row.from_partner_location_id),
    toPartnerLocationId: toNumOrUndefined(row.to_partner_location_id),
    changedByUserId: toNumOrUndefined(row.changed_by_user_id),
  }),
  (h) => ({
    ...baseEntityColumns(h),
    user_id: h.userId,
    from_partner_location_id: h.fromPartnerLocationId,
    to_partner_location_id: h.toPartnerLocationId,
    changed_by_user_id: h.changedByUserId,
  }),
);

export class PostgresUserLocationHistoryRepository implements UserLocationHistoryRepository {
  async record(entry: UserLocationHistory): Promise<UserLocationHistory> {
    return history.insert(entry);
  }

  async listByUser(userId: number): Promise<UserLocationHistory[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM user_location_history WHERE user_id = ${userId} ORDER BY created_at DESC, id DESC
    `;
    return history.mapRows(rows);
  }
}
