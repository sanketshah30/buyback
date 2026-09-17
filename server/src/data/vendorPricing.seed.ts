import { PartnerCategoryVendorMapping, SkuPricing } from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';
import { CATEGORY_LAPTOP_ID, CATEGORY_SMARTPHONE_ID, SKU_IPHONE_13_128_BLUE_ID } from './catalog.seed';
import { PARTNER_BESTBUY_ID, PARTNER_GOLDIE_GROUP_ID, PARTNER_QUICKCASH_TRADING_ID } from './partner.seed';
import { DEMO_PROMOTER_USER_ID } from './user.seed';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/**
 * Table: partner_category_vendor_mapping
 * BestBuy has two eligible vendors for Smartphones (Goldie Group and
 * QuickCash Trading) - demonstrating the "many vendors per partner+category"
 * case the calculation engine needs to evaluate - and a single vendor for
 * Laptops.
 */
export const partnerCategoryVendorMappings: PartnerCategoryVendorMapping[] = [
  { id: 1, partnerId: PARTNER_BESTBUY_ID, productCategoryId: CATEGORY_SMARTPHONE_ID, vendorId: PARTNER_GOLDIE_GROUP_ID, ...audit },
  { id: 2, partnerId: PARTNER_BESTBUY_ID, productCategoryId: CATEGORY_SMARTPHONE_ID, vendorId: PARTNER_QUICKCASH_TRADING_ID, ...audit },
  { id: 3, partnerId: PARTNER_BESTBUY_ID, productCategoryId: CATEGORY_LAPTOP_ID, vendorId: PARTNER_GOLDIE_GROUP_ID, ...audit },
];

/**
 * Table: sku_pricing
 * Two vendors pricing the same SKU differently - this spread is exactly
 * what the calculation engine will compare when picking a winning vendor.
 */
export const skuPricing: SkuPricing[] = [
  {
    id: 1,
    vendorId: PARTNER_GOLDIE_GROUP_ID,
    skuId: SKU_IPHONE_13_128_BLUE_ID,
    price: 21000,
    validFrom: SEEDED_AT,
    uploadedById: DEMO_PROMOTER_USER_ID,
    ...audit,
  },
  {
    id: 2,
    vendorId: PARTNER_QUICKCASH_TRADING_ID,
    skuId: SKU_IPHONE_13_128_BLUE_ID,
    price: 22500,
    validFrom: SEEDED_AT,
    uploadedById: DEMO_PROMOTER_USER_ID,
    ...audit,
  },
];

reserveIdRange('partner_category_vendor_mapping', partnerCategoryVendorMappings.length);
reserveIdRange('sku_pricing', skuPricing.length);
