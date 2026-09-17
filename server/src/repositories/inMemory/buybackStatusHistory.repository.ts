import { BuybackStatusHistory } from '../../types/domain';
import { BuybackStatusHistoryRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemoryBuybackStatusHistoryRepository implements BuybackStatusHistoryRepository {
  async record(entry: BuybackStatusHistory): Promise<BuybackStatusHistory> {
    tables.buybackStatusHistory.set(entry.id, entry);
    addToIndex(indexes.buybackStatusHistoryByBuybackRequestId, entry.buybackRequestId, entry.id);
    return entry;
  }

  async listByBuybackRequest(buybackRequestId: number): Promise<BuybackStatusHistory[]> {
    return getIndexed(indexes.buybackStatusHistoryByBuybackRequestId, buybackRequestId, tables.buybackStatusHistory).sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1,
    );
  }
}
