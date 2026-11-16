export const ADMIN_RIGHTS = [
  'manage_partners',
  'manage_locations',
  'manage_users',
  'manage_roles',
  'manage_catalog',
  'manage_pricing',
  'view_reports',
] as const;

export function isAdminUser(hasRight: (right: string) => boolean): boolean {
  return ADMIN_RIGHTS.some((right) => hasRight(right));
}

export interface AdminNavItem {
  label: string;
  path: string;
  right: string;
}

export interface AdminNavSection {
  key: 'product' | 'partner' | 'config';
  title: string;
  description: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavSection[] = [
  {
    key: 'product',
    title: 'Product Onboarding',
    description: 'Manage the device catalog: categories, brands, products and SKUs.',
    items: [
      { label: 'Categories', path: '/admin/catalog/categories', right: 'manage_catalog' },
      { label: 'Brands', path: '/admin/catalog/brands', right: 'manage_catalog' },
      { label: 'Products', path: '/admin/catalog/products', right: 'manage_catalog' },
      { label: 'SKUs', path: '/admin/catalog/skus', right: 'manage_catalog' },
    ],
  },
  {
    key: 'partner',
    title: 'Partner Onboarding',
    description: 'Onboard partners, their locations and the staff who work at them.',
    items: [
      { label: 'Partners', path: '/admin/partners', right: 'manage_partners' },
      { label: 'Locations', path: '/admin/locations', right: 'manage_locations' },
      { label: 'Users', path: '/admin/users', right: 'manage_users' },
    ],
  },
  {
    key: 'config',
    title: 'Buyback Config',
    description: 'Vendor SKU pricing and depreciation rules used by the valuation engine.',
    items: [
      { label: 'SKU Pricing', path: '/admin/pricing/sku', right: 'manage_pricing' },
      { label: 'Depreciation Configs', path: '/admin/pricing/depreciation-configs', right: 'manage_pricing' },
      { label: 'Depreciation Matrix', path: '/admin/pricing/depreciation-matrix', right: 'manage_pricing' },
    ],
  },
];
