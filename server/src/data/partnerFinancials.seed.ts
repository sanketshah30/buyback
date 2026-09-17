import { PartnerMarginConfig, VendorFeeConfig } from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';
import { CATEGORY_LAPTOP_ID, CATEGORY_SMARTPHONE_ID } from './catalog.seed';
import { LOCATION_BESTBUY_NYC_ID, PARTNER_BESTBUY_ID, PARTNER_GOLDIE_GROUP_ID, PARTNER_QUICKCASH_TRADING_ID } from './partner.seed';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/**
 * Table: partner_margin_config
 * BestBuy's default margin (applies to every location, via the
 * partnerLocationId=0 wildcard) is 10% for Smartphones - New York
 * specifically negotiates a slightly higher 12%, demonstrating the
 * exact-location-beats-wildcard precedence.
 */
export const partnerMarginConfigs: PartnerMarginConfig[] = [
  { id: 1, partnerId: PARTNER_BESTBUY_ID, partnerLocationId: 0, productCategoryId: CATEGORY_SMARTPHONE_ID, marginPercent: 10, ...audit },
  { id: 2, partnerId: PARTNER_BESTBUY_ID, partnerLocationId: LOCATION_BESTBUY_NYC_ID, productCategoryId: CATEGORY_SMARTPHONE_ID, marginPercent: 12, ...audit },
  { id: 3, partnerId: PARTNER_BESTBUY_ID, partnerLocationId: 0, productCategoryId: CATEGORY_LAPTOP_ID, marginPercent: 8, ...audit },
];

/** Table: vendor_fee_config - each vendor's fixed operating fee per category. */
export const vendorFeeConfigs: VendorFeeConfig[] = [
  { id: 1, vendorId: PARTNER_GOLDIE_GROUP_ID, productCategoryId: CATEGORY_SMARTPHONE_ID, feeAmount: 500, ...audit },
  { id: 2, vendorId: PARTNER_QUICKCASH_TRADING_ID, productCategoryId: CATEGORY_SMARTPHONE_ID, feeAmount: 750, ...audit },
  { id: 3, vendorId: PARTNER_GOLDIE_GROUP_ID, productCategoryId: CATEGORY_LAPTOP_ID, feeAmount: 600, ...audit },
];

reserveIdRange('partner_margin_config', partnerMarginConfigs.length);
reserveIdRange('vendor_fee_config', vendorFeeConfigs.length);
