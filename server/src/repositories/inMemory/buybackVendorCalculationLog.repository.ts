import { BuybackVendorCalculationLog } from '../../types/domain';
import { BuybackVendorCalculationLogRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemoryBuybackVendorCalculationLogRepository implements BuybackVendorCalculationLogRepository {
  async record(entry: BuybackVendorCalculationLog): Promise<BuybackVendorCalculationLog> {
    tables.buybackVendorCalculationLog.set(entry.id, entry);
    addToIndex(indexes.buybackVendorCalculationLogByBuybackRequestId, entry.buybackRequestId, entry.id);
    return entry;
  }

  async listByBuybackRequest(buybackRequestId: number): Promise<BuybackVendorCalculationLog[]> {
    return getIndexed(indexes.buybackVendorCalculationLogByBuybackRequestId, buybackRequestId, tables.buybackVendorCalculationLog).sort(
      (a, b) => b.buybackValue - a.buybackValue,
    );
  }
}
