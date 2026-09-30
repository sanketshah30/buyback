import { Brand, Category, Product, Sku, SkuAlias } from '../../types/domain';
import { CatalogRepository } from '../interfaces';
import { JsonDocStore } from './jsonDocStore';

const categories = new JsonDocStore<Category>('categories');
const brands = new JsonDocStore<Brand>('brands');
const products = new JsonDocStore<Product>('products');
const skus = new JsonDocStore<Sku>('skus');
const skuAliases = new JsonDocStore<SkuAlias>('sku_aliases');

export class PostgresCatalogRepository implements CatalogRepository {
  async listCategories(): Promise<Category[]> {
    return (await categories.listAll()).filter((c) => c.isActive);
  }

  async listBrandsByCategory(categoryId: number): Promise<Brand[]> {
    const categoryProducts = await products.findByJsonInt('categoryId', categoryId);
    const brandIds = new Set<number>();
    for (const product of categoryProducts) {
      if (product.isActive) brandIds.add(product.brandId);
    }
    return (await brands.listAll()).filter((b) => brandIds.has(b.id) && b.isActive);
  }

  async listProducts(categoryId: number, brandId: number): Promise<Product[]> {
    return (await products.findByJsonIntPair('categoryId', categoryId, 'brandId', brandId)).filter((p) => p.isActive);
  }

  async listSkus(productId: number): Promise<Sku[]> {
    return (await skus.findByJsonInt('productId', productId)).filter((s) => s.isActive);
  }

  async listSkuAliases(skuId: number): Promise<SkuAlias[]> {
    return (await skuAliases.findByJsonInt('skuId', skuId)).filter((a) => a.isActive);
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
