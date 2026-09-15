import { Brand, Category, Product, Question, Sku, SkuAlias } from '../types/domain';

// Fixed timestamp for deterministic mock seed data - a real DB would use actual
// row-level created_at/updated_at values maintained by inserts/updates.
const SEEDED_AT = '2026-01-01T00:00:00.000Z';

const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/** Table: product_categories */
export const categories: Category[] = [
  { id: 'cat-smartphone', name: 'Smartphones', type: 'smartphone', ...audit },
  { id: 'cat-tablet', name: 'Tablets', type: 'non-smartphone', ...audit },
  { id: 'cat-laptop', name: 'Laptops', type: 'non-smartphone', ...audit },
  { id: 'cat-smartwatch', name: 'Smartwatches', type: 'non-smartphone', ...audit },
];

/**
 * Table: brands
 * Standalone (no categoryId) - the same brand row is reused across every
 * category it sells in; the category relationship lives on `products`.
 */
export const brands: Brand[] = [
  { id: 'brand-apple', name: 'Apple', ...audit },
  { id: 'brand-samsung', name: 'Samsung', ...audit },
  { id: 'brand-oneplus', name: 'OnePlus', ...audit },
  { id: 'brand-xiaomi', name: 'Xiaomi', ...audit },
  { id: 'brand-dell', name: 'Dell', ...audit },
  { id: 'brand-hp', name: 'HP', ...audit },
];

/**
 * Table: products
 * FKs: categoryId -> product_categories.id, brandId -> brands.id
 */
export const products: Product[] = [
  { id: 'product-iphone-13', categoryId: 'cat-smartphone', brandId: 'brand-apple', name: 'iPhone 13', basePrice: 32000, ...audit },
  { id: 'product-iphone-14', categoryId: 'cat-smartphone', brandId: 'brand-apple', name: 'iPhone 14', basePrice: 42000, ...audit },
  { id: 'product-galaxy-s22', categoryId: 'cat-smartphone', brandId: 'brand-samsung', name: 'Galaxy S22', basePrice: 30000, ...audit },
  { id: 'product-galaxy-s23', categoryId: 'cat-smartphone', brandId: 'brand-samsung', name: 'Galaxy S23', basePrice: 40000, ...audit },
  { id: 'product-oneplus-11', categoryId: 'cat-smartphone', brandId: 'brand-oneplus', name: 'OnePlus 11', basePrice: 28000, ...audit },
  { id: 'product-redmi-note-12', categoryId: 'cat-smartphone', brandId: 'brand-xiaomi', name: 'Redmi Note 12', basePrice: 9000, ...audit },

  { id: 'product-ipad-9', categoryId: 'cat-tablet', brandId: 'brand-apple', name: 'iPad (9th Gen)', basePrice: 18000, ...audit },
  { id: 'product-tab-s8', categoryId: 'cat-tablet', brandId: 'brand-samsung', name: 'Galaxy Tab S8', basePrice: 22000, ...audit },

  { id: 'product-macbook-air-m1', categoryId: 'cat-laptop', brandId: 'brand-apple', name: 'MacBook Air M1', basePrice: 55000, ...audit },
  { id: 'product-xps-13', categoryId: 'cat-laptop', brandId: 'brand-dell', name: 'XPS 13', basePrice: 48000, ...audit },
  { id: 'product-pavilion-15', categoryId: 'cat-laptop', brandId: 'brand-hp', name: 'Pavilion 15', basePrice: 32000, ...audit },

  { id: 'product-apple-watch-7', categoryId: 'cat-smartwatch', brandId: 'brand-apple', name: 'Apple Watch Series 7', basePrice: 15000, ...audit },
  { id: 'product-galaxy-watch-5', categoryId: 'cat-smartwatch', brandId: 'brand-samsung', name: 'Galaxy Watch 5', basePrice: 12000, ...audit },
];

/**
 * Table: skus
 * FK: productId -> products.id
 */
export const skus: Sku[] = [
  { id: 'sku-iphone13-128-blue', productId: 'product-iphone-13', code: 'IP13-128-BLU', label: '128GB / Blue', priceModifier: 0, ...audit },
  { id: 'sku-iphone13-256-black', productId: 'product-iphone-13', code: 'IP13-256-BLK', label: '256GB / Midnight', priceModifier: 3000, ...audit },

  { id: 'sku-iphone14-128-blue', productId: 'product-iphone-14', code: 'IP14-128-BLU', label: '128GB / Blue', priceModifier: 0, ...audit },
  { id: 'sku-iphone14-256-starlight', productId: 'product-iphone-14', code: 'IP14-256-STL', label: '256GB / Starlight', priceModifier: 4000, ...audit },

  { id: 'sku-s22-128-green', productId: 'product-galaxy-s22', code: 'S22-128-GRN', label: '128GB / Green', priceModifier: 0, ...audit },
  { id: 'sku-s23-256-cream', productId: 'product-galaxy-s23', code: 'S23-256-CRM', label: '256GB / Cream', priceModifier: 2500, ...audit },

  { id: 'sku-op11-256-green', productId: 'product-oneplus-11', code: 'OP11-256-GRN', label: '256GB / Eternal Green', priceModifier: 0, ...audit },
  { id: 'sku-redmi-note12-128-grey', productId: 'product-redmi-note-12', code: 'RN12-128-GRY', label: '128GB / Grey', priceModifier: 0, ...audit },

  { id: 'sku-ipad9-64-silver', productId: 'product-ipad-9', code: 'IPAD9-64-SLV', label: '64GB / Silver / Wi-Fi', priceModifier: 0, ...audit },
  { id: 'sku-tabs8-128-graphite', productId: 'product-tab-s8', code: 'TABS8-128-GRP', label: '128GB / Graphite', priceModifier: 0, ...audit },

  { id: 'sku-mba-m1-256-gold', productId: 'product-macbook-air-m1', code: 'MBA-M1-256-GLD', label: '256GB / Gold', priceModifier: 0, ...audit },
  { id: 'sku-xps13-512-silver', productId: 'product-xps-13', code: 'XPS13-512-SLV', label: '512GB / Platinum Silver', priceModifier: 5000, ...audit },
  { id: 'sku-pavilion15-512-natural', productId: 'product-pavilion-15', code: 'PAV15-512-NAT', label: '512GB / Natural Silver', priceModifier: 0, ...audit },

  { id: 'sku-aw7-41-midnight', productId: 'product-apple-watch-7', code: 'AW7-41-MID', label: '41mm / Midnight', priceModifier: 0, ...audit },
  { id: 'sku-gw5-44-graphite', productId: 'product-galaxy-watch-5', code: 'GW5-44-GRP', label: '44mm / Graphite', priceModifier: 0, ...audit },
];

/**
 * Table: sku_aliases
 * FK: skuId -> skus.id
 * Example partner-side SKU naming/ID mappings onto our canonical SKUs, so an
 * inbound feed from a reselling/trade-in partner can be resolved without the
 * partner needing to know our internal SKU IDs.
 */
export const skuAliases: SkuAlias[] = [
  { id: 'skualias-cashify-ip13-128-blue', skuId: 'sku-iphone13-128-blue', partnerId: 'partner-cashify', partnerSkuName: 'Apple iPhone 13 128GB Blue', ...audit },
  { id: 'skualias-quikr-ip13-128-blue', skuId: 'sku-iphone13-128-blue', partnerId: 'partner-quikr', partnerSkuName: 'iPhone13-128-Blue', ...audit },
  { id: 'skualias-cashify-s23-256-cream', skuId: 'sku-s23-256-cream', partnerId: 'partner-cashify', partnerSkuName: 'Samsung Galaxy S23 256GB Cream', ...audit },
  { id: 'skualias-cashify-mba-m1-256-gold', skuId: 'sku-mba-m1-256-gold', partnerId: 'partner-cashify', partnerSkuName: 'Apple MacBook Air M1 256GB Gold', ...audit },
];

const yesNoOptions = (yesImpact: number, noImpact: number) => [
  { id: 'yes', label: 'Yes', valueImpactPercent: yesImpact },
  { id: 'no', label: 'No', valueImpactPercent: noImpact },
];

/**
 * Questionnaire is configurable per category, as required by the product spec.
 * `valueImpactPercent` is a percentage deducted (positive) or added (negative)
 * from the running device value when an option is selected.
 */
export const questionsByCategory: Record<string, Question[]> = {
  'cat-smartphone': [
    {
      id: 'q-powers-on',
      categoryId: 'cat-smartphone',
      text: 'Is the device powering on?',
      type: 'single-choice',
      options: yesNoOptions(0, 70),
    },
    {
      id: 'q-screen-damage',
      categoryId: 'cat-smartphone',
      text: 'Are there any scratches/dents/discoloration on the screen?',
      type: 'single-choice',
      options: yesNoOptions(15, 0),
    },
    {
      id: 'q-body-damage',
      categoryId: 'cat-smartphone',
      text: 'Are there any damages/dents on the body?',
      type: 'single-choice',
      options: yesNoOptions(10, 0),
    },
    {
      id: 'q-accessories',
      categoryId: 'cat-smartphone',
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
questionsByCategory['cat-tablet'] = questionsByCategory['cat-smartphone'].map((q) => ({
  ...q,
  id: `${q.id}-tablet`,
  categoryId: 'cat-tablet',
}));
questionsByCategory['cat-laptop'] = questionsByCategory['cat-smartphone'].map((q) => ({
  ...q,
  id: `${q.id}-laptop`,
  categoryId: 'cat-laptop',
  text: q.id === 'q-screen-damage' ? 'Are there any scratches/dents/discoloration on the display?' : q.text,
}));
questionsByCategory['cat-smartwatch'] = questionsByCategory['cat-smartphone'].map((q) => ({
  ...q,
  id: `${q.id}-watch`,
  categoryId: 'cat-smartwatch',
}));
