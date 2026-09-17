import { PartnerCategoryVendorMapping, SkuPricing } from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';
import { CATEGORY_LAPTOP_ID, CATEGORY_SMARTPHONE_ID, CATEGORY_SMARTWATCH_ID, CATEGORY_TABLET_ID } from './catalog.seed';
import { PARTNER_BESTBUY_ID, PARTNER_GOLDIE_GROUP_ID, PARTNER_QUICKCASH_TRADING_ID } from './partner.seed';
import { DEMO_PROMOTER_USER_ID } from './user.seed';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/**
 * Table: partner_category_vendor_mapping
 * BestBuy uses Goldie Group across every category, plus a second eligible
 * vendor (QuickCash Trading) for Smartphones specifically - demonstrating
 * the "many vendors per partner+category" case the calculation engine
 * needs to evaluate.
 */
export const partnerCategoryVendorMappings: PartnerCategoryVendorMapping[] = [
  { id: 1, partnerId: PARTNER_BESTBUY_ID, productCategoryId: CATEGORY_SMARTPHONE_ID, vendorId: PARTNER_GOLDIE_GROUP_ID, ...audit },
  { id: 2, partnerId: PARTNER_BESTBUY_ID, productCategoryId: CATEGORY_SMARTPHONE_ID, vendorId: PARTNER_QUICKCASH_TRADING_ID, ...audit },
  { id: 3, partnerId: PARTNER_BESTBUY_ID, productCategoryId: CATEGORY_LAPTOP_ID, vendorId: PARTNER_GOLDIE_GROUP_ID, ...audit },
  { id: 4, partnerId: PARTNER_BESTBUY_ID, productCategoryId: CATEGORY_TABLET_ID, vendorId: PARTNER_GOLDIE_GROUP_ID, ...audit },
  { id: 5, partnerId: PARTNER_BESTBUY_ID, productCategoryId: CATEGORY_SMARTWATCH_ID, vendorId: PARTNER_GOLDIE_GROUP_ID, ...audit },
];

/**
 * Table: sku_pricing
 * Every catalog SKU has at least one active vendor price (Goldie Group),
 * so the buyback flow's valuation step always has something to resolve.
 * SKU 1 (iPhone 13 128GB Blue) additionally has a second, higher price from
 * QuickCash Trading - the calculation engine's "pick a winning vendor"
 * example. Prices approximate a typical used-device buyback discount off
 * the device's original retail price (no catalog price exists to derive
 * this from anymore - see the `Product`/`Sku` doc comments in
 * types/domain.ts).
 */
export const skuPricing: SkuPricing[] = [
  { id: 1, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 1, price: 21000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // iPhone 13 128GB Blue
  { id: 2, vendorId: PARTNER_QUICKCASH_TRADING_ID, skuId: 1, price: 22500, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // iPhone 13 128GB Blue (2nd vendor)
  { id: 3, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 2, price: 23000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // iPhone 13 256GB Midnight
  { id: 4, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 3, price: 27500, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // iPhone 14 128GB Blue
  { id: 5, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 4, price: 30000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // iPhone 14 256GB Starlight
  { id: 6, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 5, price: 19500, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // Galaxy S22 128GB Green
  { id: 7, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 6, price: 28000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // Galaxy S23 256GB Cream
  { id: 8, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 7, price: 18500, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // OnePlus 11 256GB
  { id: 9, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 8, price: 6000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // Redmi Note 12 128GB
  { id: 10, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 9, price: 12000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // iPad (9th Gen) 64GB
  { id: 11, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 10, price: 14500, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // Galaxy Tab S8 128GB
  { id: 12, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 11, price: 36000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // MacBook Air M1 256GB Gold
  { id: 13, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 12, price: 35000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // XPS 13 512GB
  { id: 14, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 13, price: 21000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // Pavilion 15 512GB
  { id: 15, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 14, price: 10000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // Apple Watch Series 7 41mm
  { id: 16, vendorId: PARTNER_GOLDIE_GROUP_ID, skuId: 15, price: 8000, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit }, // Galaxy Watch 5 44mm
];

reserveIdRange('partner_category_vendor_mapping', partnerCategoryVendorMappings.length);
reserveIdRange('sku_pricing', skuPricing.length);
