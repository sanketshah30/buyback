import { Brand, Category, Model, Question, Sku } from '../types/domain';

export const categories: Category[] = [
  { id: 'cat-smartphone', name: 'Smartphones', type: 'smartphone' },
  { id: 'cat-tablet', name: 'Tablets', type: 'non-smartphone' },
  { id: 'cat-laptop', name: 'Laptops', type: 'non-smartphone' },
  { id: 'cat-smartwatch', name: 'Smartwatches', type: 'non-smartphone' },
];

export const brands: Brand[] = [
  { id: 'brand-apple', categoryId: 'cat-smartphone', name: 'Apple' },
  { id: 'brand-samsung', categoryId: 'cat-smartphone', name: 'Samsung' },
  { id: 'brand-oneplus', categoryId: 'cat-smartphone', name: 'OnePlus' },
  { id: 'brand-xiaomi', categoryId: 'cat-smartphone', name: 'Xiaomi' },

  { id: 'brand-apple-tab', categoryId: 'cat-tablet', name: 'Apple' },
  { id: 'brand-samsung-tab', categoryId: 'cat-tablet', name: 'Samsung' },

  { id: 'brand-apple-laptop', categoryId: 'cat-laptop', name: 'Apple' },
  { id: 'brand-dell', categoryId: 'cat-laptop', name: 'Dell' },
  { id: 'brand-hp', categoryId: 'cat-laptop', name: 'HP' },

  { id: 'brand-apple-watch', categoryId: 'cat-smartwatch', name: 'Apple' },
  { id: 'brand-samsung-watch', categoryId: 'cat-smartwatch', name: 'Samsung' },
];

export const models: Model[] = [
  { id: 'model-iphone-13', categoryId: 'cat-smartphone', brandId: 'brand-apple', name: 'iPhone 13', basePrice: 32000 },
  { id: 'model-iphone-14', categoryId: 'cat-smartphone', brandId: 'brand-apple', name: 'iPhone 14', basePrice: 42000 },
  { id: 'model-galaxy-s22', categoryId: 'cat-smartphone', brandId: 'brand-samsung', name: 'Galaxy S22', basePrice: 30000 },
  { id: 'model-galaxy-s23', categoryId: 'cat-smartphone', brandId: 'brand-samsung', name: 'Galaxy S23', basePrice: 40000 },
  { id: 'model-oneplus-11', categoryId: 'cat-smartphone', brandId: 'brand-oneplus', name: 'OnePlus 11', basePrice: 28000 },
  { id: 'model-redmi-note-12', categoryId: 'cat-smartphone', brandId: 'brand-xiaomi', name: 'Redmi Note 12', basePrice: 9000 },

  { id: 'model-ipad-9', categoryId: 'cat-tablet', brandId: 'brand-apple-tab', name: 'iPad (9th Gen)', basePrice: 18000 },
  { id: 'model-tab-s8', categoryId: 'cat-tablet', brandId: 'brand-samsung-tab', name: 'Galaxy Tab S8', basePrice: 22000 },

  { id: 'model-macbook-air-m1', categoryId: 'cat-laptop', brandId: 'brand-apple-laptop', name: 'MacBook Air M1', basePrice: 55000 },
  { id: 'model-xps-13', categoryId: 'cat-laptop', brandId: 'brand-dell', name: 'XPS 13', basePrice: 48000 },
  { id: 'model-pavilion-15', categoryId: 'cat-laptop', brandId: 'brand-hp', name: 'Pavilion 15', basePrice: 32000 },

  { id: 'model-apple-watch-7', categoryId: 'cat-smartwatch', brandId: 'brand-apple-watch', name: 'Apple Watch Series 7', basePrice: 15000 },
  { id: 'model-galaxy-watch-5', categoryId: 'cat-smartwatch', brandId: 'brand-samsung-watch', name: 'Galaxy Watch 5', basePrice: 12000 },
];

export const skus: Sku[] = [
  { id: 'sku-iphone13-128-blue', modelId: 'model-iphone-13', code: 'IP13-128-BLU', label: '128GB / Blue', priceModifier: 0 },
  { id: 'sku-iphone13-256-black', modelId: 'model-iphone-13', code: 'IP13-256-BLK', label: '256GB / Midnight', priceModifier: 3000 },

  { id: 'sku-iphone14-128-blue', modelId: 'model-iphone-14', code: 'IP14-128-BLU', label: '128GB / Blue', priceModifier: 0 },
  { id: 'sku-iphone14-256-starlight', modelId: 'model-iphone-14', code: 'IP14-256-STL', label: '256GB / Starlight', priceModifier: 4000 },

  { id: 'sku-s22-128-green', modelId: 'model-galaxy-s22', code: 'S22-128-GRN', label: '128GB / Green', priceModifier: 0 },
  { id: 'sku-s23-256-cream', modelId: 'model-galaxy-s23', code: 'S23-256-CRM', label: '256GB / Cream', priceModifier: 2500 },

  { id: 'sku-op11-256-green', modelId: 'model-oneplus-11', code: 'OP11-256-GRN', label: '256GB / Eternal Green', priceModifier: 0 },
  { id: 'sku-redmi-note12-128-grey', modelId: 'model-redmi-note-12', code: 'RN12-128-GRY', label: '128GB / Grey', priceModifier: 0 },

  { id: 'sku-ipad9-64-silver', modelId: 'model-ipad-9', code: 'IPAD9-64-SLV', label: '64GB / Silver / Wi-Fi', priceModifier: 0 },
  { id: 'sku-tabs8-128-graphite', modelId: 'model-tab-s8', code: 'TABS8-128-GRP', label: '128GB / Graphite', priceModifier: 0 },

  { id: 'sku-mba-m1-256-gold', modelId: 'model-macbook-air-m1', code: 'MBA-M1-256-GLD', label: '256GB / Gold', priceModifier: 0 },
  { id: 'sku-xps13-512-silver', modelId: 'model-xps-13', code: 'XPS13-512-SLV', label: '512GB / Platinum Silver', priceModifier: 5000 },
  { id: 'sku-pavilion15-512-natural', modelId: 'model-pavilion-15', code: 'PAV15-512-NAT', label: '512GB / Natural Silver', priceModifier: 0 },

  { id: 'sku-aw7-41-midnight', modelId: 'model-apple-watch-7', code: 'AW7-41-MID', label: '41mm / Midnight', priceModifier: 0 },
  { id: 'sku-gw5-44-graphite', modelId: 'model-galaxy-watch-5', code: 'GW5-44-GRP', label: '44mm / Graphite', priceModifier: 0 },
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
