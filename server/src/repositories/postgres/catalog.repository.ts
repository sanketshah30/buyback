import { getSql } from '../../db/postgres';
import { Brand, Category, Product, Sku, SkuAlias } from '../../types/domain';
import { CatalogRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const categories = new EntityTable<Category>(
  'categories',
  'Category',
  (row) => ({
    ...mapBaseEntity(row),
    name: String(row.name),
    type: row.type as Category['type'],
  }),
  (c) => ({ ...baseEntityColumns(c), name: c.name, type: c.type }),
);

const brands = new EntityTable<Brand>(
  'brands',
  'Brand',
  (row) => ({ ...mapBaseEntity(row), name: String(row.name) }),
  (b) => ({ ...baseEntityColumns(b), name: b.name }),
);

const products = new EntityTable<Product>(
  'products',
  'Product',
  (row) => ({
    ...mapBaseEntity(row),
    categoryId: toNum(row.category_id),
    brandId: toNum(row.brand_id),
    name: String(row.name),
  }),
  (p) => ({ ...baseEntityColumns(p), category_id: p.categoryId, brand_id: p.brandId, name: p.name }),
);

const skus = new EntityTable<Sku>(
  'skus',
  'SKU',
  (row) => ({
    ...mapBaseEntity(row),
    productId: toNum(row.product_id),
    code: String(row.code),
    label: String(row.label),
  }),
  (s) => ({ ...baseEntityColumns(s), product_id: s.productId, code: s.code, label: s.label }),
);

const skuAliases = new EntityTable<SkuAlias>(
  'sku_aliases',
  'SKU alias',
  (row) => ({
    ...mapBaseEntity(row),
    skuId: toNum(row.sku_id),
    partnerId: String(row.partner_id),
    partnerSkuName: String(row.partner_sku_name),
  }),
  (a) => ({
    ...baseEntityColumns(a),
    sku_id: a.skuId,
    partner_id: a.partnerId,
    partner_sku_name: a.partnerSkuName,
  }),
);

export class PostgresCatalogRepository implements CatalogRepository {
  async listCategories(): Promise<Category[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM categories WHERE is_active = true ORDER BY id`;
    return categories.mapRows(rows);
  }

  async listBrandsByCategory(categoryId: number): Promise<Brand[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT DISTINCT b.*
      FROM brands b
      JOIN products p ON p.brand_id = b.id
      WHERE p.category_id = ${categoryId} AND p.is_active = true AND b.is_active = true
      ORDER BY b.id
    `;
    return brands.mapRows(rows);
  }

  async listProducts(categoryId: number, brandId: number): Promise<Product[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM products
      WHERE category_id = ${categoryId} AND brand_id = ${brandId} AND is_active = true
      ORDER BY id
    `;
    return products.mapRows(rows);
  }

  async listSkus(productId: number): Promise<Sku[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM skus WHERE product_id = ${productId} AND is_active = true ORDER BY id
    `;
    return skus.mapRows(rows);
  }

  async listSkuAliases(skuId: number): Promise<SkuAlias[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM sku_aliases WHERE sku_id = ${skuId} AND is_active = true ORDER BY id
    `;
    return skuAliases.mapRows(rows);
  }

  async getCategory(categoryId: number): Promise<Category | undefined> {
    const row = await categories.get(categoryId);
    return row?.isActive ? row : undefined;
  }

  async getBrand(brandId: number): Promise<Brand | undefined> {
    const row = await brands.get(brandId);
    return row?.isActive ? row : undefined;
  }

  async getProduct(productId: number): Promise<Product | undefined> {
    return products.get(productId);
  }

  async getSku(skuId: number): Promise<Sku | undefined> {
    return skus.get(skuId);
  }
}
