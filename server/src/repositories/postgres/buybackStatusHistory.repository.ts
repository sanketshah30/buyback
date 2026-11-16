import { getSql } from '../../db/postgres';
import { BuybackStatusHistory } from '../../types/domain';
import { BuybackStatusHistoryRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum, toNumOrUndefined } from './helpers';

const history = new EntityTable<BuybackStatusHistory>(
  'buyback_status_history',
  'Buyback status history',
  (row) => ({
    ...mapBaseEntity(row),
    buybackRequestId: toNum(row.buyback_request_id),
    requestStatusId: toNum(row.request_status_id),
    changedByUserId: toNumOrUndefined(row.changed_by_user_id),
  }),
  (h) => ({
    ...baseEntityColumns(h),
    buyback_request_id: h.buybackRequestId,
    request_status_id: h.requestStatusId,
    changed_by_user_id: h.changedByUserId,
  }),
);

export class PostgresBuybackStatusHistoryRepository implements BuybackStatusHistoryRepository {
  async record(entry: BuybackStatusHistory): Promise<BuybackStatusHistory> {
    return history.insert(entry);
  }

  async listByBuybackRequest(buybackRequestId: number): Promise<BuybackStatusHistory[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM buyback_status_history
      WHERE buyback_request_id = ${buybackRequestId}
      ORDER BY created_at ASC, id ASC
    `;
    return history.mapRows(rows);
  }
}
