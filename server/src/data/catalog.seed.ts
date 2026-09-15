import { Brand, Category, Product, Question, Sku, SkuAlias } from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';

// Fixed timestamp for deterministic mock seed data - a real DB would use actual
// row-level created_at/updated_at values maintained by inserts/updates.
const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/** Table: product_categories */
export const categories: Category[] = [
  { id: 1, name: 'Smartphones', type: 'smartphone', ...audit },
  { id: 2, name: 'Tablets', type: 'non-smartphone', ...audit },
  { id: 3, name: 'Laptops', type: 'non-smartphone', ...audit },
  { id: 4, name: 'Smartwatches', type: 'non-smartphone', ...audit },
];
export const CATEGORY_SMARTPHONE_ID = 1;
export const CATEGORY_TABLET_ID = 2;
export const CATEGORY_LAPTOP_ID = 3;
export const CATEGORY_SMARTWATCH_ID = 4;

/**
 * Table: brands
 * Standalone (no categoryId) - the same brand row is reused across every
 * category it sells in; the category relationship lives on `products`.
 */
export const brands: Brand[] = [
  { id: 1, name: 'Apple', ...audit },
  { id: 2, name: 'Samsung', ...audit },
  { id: 3, name: 'OnePlus', ...audit },
  { id: 4, name: 'Xiaomi', ...audit },
  { id: 5, name: 'Dell', ...audit },
  { id: 6, name: 'HP', ...audit },
];
export const BRAND_APPLE_ID = 1;
export const BRAND_SAMSUNG_ID = 2;
export const BRAND_ONEPLUS_ID = 3;
export const BRAND_XIAOMI_ID = 4;
export const BRAND_DELL_ID = 5;
export const BRAND_HP_ID = 6;

/**
 * Table: products
 * FKs: categoryId -> product_categories.id, brandId -> brands.id
 */
export const products: Product[] = [
  { id: 1, categoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_APPLE_ID, name: 'iPhone 13', basePrice: 32000, ...audit },
  { id: 2, categoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_APPLE_ID, name: 'iPhone 14', basePrice: 42000, ...audit },
  { id: 3, categoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_SAMSUNG_ID, name: 'Galaxy S22', basePrice: 30000, ...audit },
  { id: 4, categoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_SAMSUNG_ID, name: 'Galaxy S23', basePrice: 40000, ...audit },
  { id: 5, categoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_ONEPLUS_ID, name: 'OnePlus 11', basePrice: 28000, ...audit },
  { id: 6, categoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_XIAOMI_ID, name: 'Redmi Note 12', basePrice: 9000, ...audit },

  { id: 7, categoryId: CATEGORY_TABLET_ID, brandId: BRAND_APPLE_ID, name: 'iPad (9th Gen)', basePrice: 18000, ...audit },
  { id: 8, categoryId: CATEGORY_TABLET_ID, brandId: BRAND_SAMSUNG_ID, name: 'Galaxy Tab S8', basePrice: 22000, ...audit },

  { id: 9, categoryId: CATEGORY_LAPTOP_ID, brandId: BRAND_APPLE_ID, name: 'MacBook Air M1', basePrice: 55000, ...audit },
  { id: 10, categoryId: CATEGORY_LAPTOP_ID, brandId: BRAND_DELL_ID, name: 'XPS 13', basePrice: 48000, ...audit },
  { id: 11, categoryId: CATEGORY_LAPTOP_ID, brandId: BRAND_HP_ID, name: 'Pavilion 15', basePrice: 32000, ...audit },

  { id: 12, categoryId: CATEGORY_SMARTWATCH_ID, brandId: BRAND_APPLE_ID, name: 'Apple Watch Series 7', basePrice: 15000, ...audit },
  { id: 13, categoryId: CATEGORY_SMARTWATCH_ID, brandId: BRAND_SAMSUNG_ID, name: 'Galaxy Watch 5', basePrice: 12000, ...audit },
];
export const PRODUCT_IPHONE_13_ID = 1;
export const PRODUCT_IPHONE_14_ID = 2;
export const PRODUCT_MACBOOK_AIR_M1_ID = 9;

/**
 * Table: skus
 * FK: productId -> products.id
 */
export const skus: Sku[] = [
  { id: 1, productId: PRODUCT_IPHONE_13_ID, code: 'IP13-128-BLU', label: '128GB / Blue', priceModifier: 0, ...audit },
  { id: 2, productId: PRODUCT_IPHONE_13_ID, code: 'IP13-256-BLK', label: '256GB / Midnight', priceModifier: 3000, ...audit },

  { id: 3, productId: PRODUCT_IPHONE_14_ID, code: 'IP14-128-BLU', label: '128GB / Blue', priceModifier: 0, ...audit },
  { id: 4, productId: PRODUCT_IPHONE_14_ID, code: 'IP14-256-STL', label: '256GB / Starlight', priceModifier: 4000, ...audit },

  { id: 5, productId: 3, code: 'S22-128-GRN', label: '128GB / Green', priceModifier: 0, ...audit },
  { id: 6, productId: 4, code: 'S23-256-CRM', label: '256GB / Cream', priceModifier: 2500, ...audit },

  { id: 7, productId: 5, code: 'OP11-256-GRN', label: '256GB / Eternal Green', priceModifier: 0, ...audit },
  { id: 8, productId: 6, code: 'RN12-128-GRY', label: '128GB / Grey', priceModifier: 0, ...audit },

  { id: 9, productId: 7, code: 'IPAD9-64-SLV', label: '64GB / Silver / Wi-Fi', priceModifier: 0, ...audit },
  { id: 10, productId: 8, code: 'TABS8-128-GRP', label: '128GB / Graphite', priceModifier: 0, ...audit },

  { id: 11, productId: PRODUCT_MACBOOK_AIR_M1_ID, code: 'MBA-M1-256-GLD', label: '256GB / Gold', priceModifier: 0, ...audit },
  { id: 12, productId: 10, code: 'XPS13-512-SLV', label: '512GB / Platinum Silver', priceModifier: 5000, ...audit },
  { id: 13, productId: 11, code: 'PAV15-512-NAT', label: '512GB / Natural Silver', priceModifier: 0, ...audit },

  { id: 14, productId: 12, code: 'AW7-41-MID', label: '41mm / Midnight', priceModifier: 0, ...audit },
  { id: 15, productId: 13, code: 'GW5-44-GRP', label: '44mm / Graphite', priceModifier: 0, ...audit },
];
export const SKU_IPHONE_13_128_BLUE_ID = 1;
export const SKU_MACBOOK_AIR_M1_256_GOLD_ID = 11;

/**
 * Table: sku_aliases
 * FK: skuId -> skus.id
 * Example partner-side SKU naming/ID mappings onto our canonical SKUs, so an
 * inbound feed from a reselling/trade-in partner can be resolved without the
 * partner needing to know our internal SKU IDs. `partnerId` is that external
 * partner's own code (not a FK into our `partners` table).
 */
export const skuAliases: SkuAlias[] = [
  { id: 1, skuId: SKU_IPHONE_13_128_BLUE_ID, partnerId: 'partner-cashify', partnerSkuName: 'Apple iPhone 13 128GB Blue', ...audit },
  { id: 2, skuId: SKU_IPHONE_13_128_BLUE_ID, partnerId: 'partner-quikr', partnerSkuName: 'iPhone13-128-Blue', ...audit },
  { id: 3, skuId: 6, partnerId: 'partner-cashify', partnerSkuName: 'Samsung Galaxy S23 256GB Cream', ...audit },
  { id: 4, skuId: SKU_MACBOOK_AIR_M1_256_GOLD_ID, partnerId: 'partner-cashify', partnerSkuName: 'Apple MacBook Air M1 256GB Gold', ...audit },
];

reserveIdRange('categories', categories.length);
reserveIdRange('brands', brands.length);
reserveIdRange('products', products.length);
reserveIdRange('skus', skus.length);
reserveIdRange('sku_aliases', skuAliases.length);

const yesNoOptions = (yesImpact: number, noImpact: number) => [
  { id: 'yes', label: 'Yes', valueImpactPercent: yesImpact },
  { id: 'no', label: 'No', valueImpactPercent: noImpact },
];

/**
 * Questionnaire is configurable per category, as required by the product spec.
 * `valueImpactPercent` is a percentage deducted (positive) or added (negative)
 * from the running device value when an option is selected.
 */
export const questionsByCategory: Record<number, Question[]> = {
  [CATEGORY_SMARTPHONE_ID]: [
    {
      id: 'q-powers-on',
      categoryId: CATEGORY_SMARTPHONE_ID,
      text: 'Is the device powering on?',
      type: 'single-choice',
      options: yesNoOptions(0, 70),
    },
    {
      id: 'q-screen-damage',
      categoryId: CATEGORY_SMARTPHONE_ID,
      text: 'Are there any scratches/dents/discoloration on the screen?',
      type: 'single-choice',
      options: yesNoOptions(15, 0),
    },
    {
      id: 'q-body-damage',
      categoryId: CATEGORY_SMARTPHONE_ID,
      text: 'Are there any damages/dents on the body?',
      type: 'single-choice',
      options: yesNoOptions(10, 0),
    },
    {
      id: 'q-accessories',
      categoryId: CATEGORY_SMARTPHONE_ID,
      text: 'What accessories are available?',
      type: 'multi-choice',
      options: [
        { id: 'charger', label: 'Charger', valueImpactPercent: -2 },
        { id: 'box', label: 'Box', valueImpactPercent: -2 },
        { id: 'headphone', label: 'Headphone', valueImpactPercent: -1 },
        { id: 'none', label: 'None of these', valueImpactPercent: 0 },
      ],
    },
  ],
};

// Non-smartphone categories reuse the same generic questionnaire shape for this MVP.
questionsByCategory[CATEGORY_TABLET_ID] = questionsByCategory[CATEGORY_SMARTPHONE_ID].map((q) => ({
  ...q,
  id: `${q.id}-tablet`,
  categoryId: CATEGORY_TABLET_ID,
}));
questionsByCategory[CATEGORY_LAPTOP_ID] = questionsByCategory[CATEGORY_SMARTPHONE_ID].map((q) => ({
  ...q,
  id: `${q.id}-laptop`,
  categoryId: CATEGORY_LAPTOP_ID,
  text: q.id === 'q-screen-damage' ? 'Are there any scratches/dents/discoloration on the display?' : q.text,
}));
questionsByCategory[CATEGORY_SMARTWATCH_ID] = questionsByCategory[CATEGORY_SMARTPHONE_ID].map((q) => ({
  ...q,
  id: `${q.id}-watch`,
  categoryId: CATEGORY_SMARTWATCH_ID,
}));
