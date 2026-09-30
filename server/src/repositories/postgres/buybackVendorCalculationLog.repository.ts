import { BuybackVendorCalculationLog } from '../../types/domain';
import { BuybackVendorCalculationLogRepository } from '../interfaces';
import { JsonDocStore } from './jsonDocStore';

const store = new JsonDocStore<BuybackVendorCalculationLog>('buyback_vendor_calculation_log');

export class PostgresBuybackVendorCalculationLogRepository implements BuybackVendorCalculationLogRepository {
  async record(entry: BuybackVendorCalculationLog): Promise<BuybackVendorCalculationLog> {
    return store.insert(entry);
  }

  async listByBuybackRequest(buybackRequestId: number): Promise<BuybackVendorCalculationLog[]> {
    const rows = await store.findByJsonInt('buybackRequestId', buybackRequestId);
    return rows.sort((a, b) => b.buybackValue - a.buybackValue);
  }
}
