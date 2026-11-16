import { getSql } from '../../db/postgres';
import { BuybackVendorCalculationLog } from '../../types/domain';
import { BuybackVendorCalculationLogRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum, toNumOrNull } from './helpers';

const logs = new EntityTable<BuybackVendorCalculationLog>(
  'buyback_vendor_calculation_log',
  'Buyback vendor calculation log',
  (row) => ({
    ...mapBaseEntity(row),
    buybackRequestId: toNum(row.buyback_request_id),
    vendorId: toNum(row.vendor_id),
    skuPricingId: toNum(row.sku_pricing_id),
    depreciationConfigId: toNumOrNull(row.depreciation_config_id),
    skuPrice: toNum(row.sku_price),
    totalDepreciationAmount: toNum(row.total_depreciation_amount),
    buybackValue: toNum(row.buyback_value),
  }),
  (l) => ({
    ...baseEntityColumns(l),
    buyback_request_id: l.buybackRequestId,
    vendor_id: l.vendorId,
    sku_pricing_id: l.skuPricingId,
    depreciation_config_id: l.depreciationConfigId,
    sku_price: l.skuPrice,
    total_depreciation_amount: l.totalDepreciationAmount,
    buyback_value: l.buybackValue,
  }),
);

export class PostgresBuybackVendorCalculationLogRepository implements BuybackVendorCalculationLogRepository {
  async record(entry: BuybackVendorCalculationLog): Promise<BuybackVendorCalculationLog> {
    return logs.insert(entry);
  }

  async listByBuybackRequest(buybackRequestId: number): Promise<BuybackVendorCalculationLog[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM buyback_vendor_calculation_log
      WHERE buyback_request_id = ${buybackRequestId}
      ORDER BY buyback_value DESC, id ASC
    `;
    return logs.mapRows(rows);
  }
}
