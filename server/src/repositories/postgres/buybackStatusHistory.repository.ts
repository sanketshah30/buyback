import { BuybackStatusHistory } from '../../types/domain';
import { BuybackStatusHistoryRepository } from '../interfaces';
import { JsonDocStore } from './jsonDocStore';

const store = new JsonDocStore<BuybackStatusHistory>('buyback_status_history');

export class PostgresBuybackStatusHistoryRepository implements BuybackStatusHistoryRepository {
  async record(entry: BuybackStatusHistory): Promise<BuybackStatusHistory> {
    return store.insert(entry);
  }

  async listByBuybackRequest(buybackRequestId: number): Promise<BuybackStatusHistory[]> {
    const rows = await store.findByJsonInt('buybackRequestId', buybackRequestId);
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }
}
