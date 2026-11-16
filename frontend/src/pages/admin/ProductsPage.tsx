import { ResourcePage } from '../../components/admin/ResourcePage';
import { brandsApi, categoriesApi, productsApi } from '../../lib/adminApi';
import { formatDateTime } from '../../lib/adminFormat';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import type { FieldDef } from '../../components/admin/FormFields';
import type { Product } from '../../types/api';

/**
 * Mirrors `products` table columns:
 * id, category_id, brand_id, name, created_at, is_active
 */
export function ProductsPage() {
  const categories = useAdminLookup(() => categoriesApi.search(), 'categories');
  const brands = useAdminLookup(() => brandsApi.search(), 'brands');
  const categoryName = nameResolver(categories.items, (c) => c.name);
  const brandName = nameResolver(brands.items, (b) => b.name);

  const fields = (editing: Product | null): FieldDef[] => [
    {
      key: 'categoryId',
      label: 'category_id',
      kind: 'select',
      required: true,
      options: toOptions(categories.items, (c) => `${c.id} — ${c.name}`, editing?.categoryId),
    },
    {
      key: 'brandId',
      label: 'brand_id',
      kind: 'select',
      required: true,
      options: toOptions(brands.items, (b) => `${b.id} — ${b.name}`, editing?.brandId),
    },
    { key: 'name', label: 'name', kind: 'text', required: true },
  ];

  return (
    <ResourcePage<Product>
      title="Products"
      entityName="product"
      columns={[
        { key: 'id', header: 'id', render: (r) => r.id },
        { key: 'name', header: 'Name', render: (r) => r.name },
        { key: 'categoryId', header: 'Category', render: (r) => categoryName(r.categoryId) },
        { key: 'brandId', header: 'Brand', render: (r) => brandName(r.brandId) },
        { key: 'createdAt', header: 'Created At', render: (r) => formatDateTime(r.createdAt) },
      ]}
      load={() => productsApi.search()}
      fields={fields}
      emptyValues={{ categoryId: '', brandId: '', name: '' }}
      toFormValues={(r) => ({
        categoryId: String(r.categoryId),
        brandId: String(r.brandId),
        name: r.name,
      })}
      onCreate={(v) =>
        productsApi.create({
          categoryId: Number(v.categoryId),
          brandId: Number(v.brandId),
          name: String(v.name).trim(),
        })
      }
      onUpdate={(row, v) =>
        productsApi.update(row.id, {
          categoryId: Number(v.categoryId),
          brandId: Number(v.brandId),
          name: String(v.name).trim(),
        })
      }
      onSetActive={(row, isActive) => productsApi.update(row.id, { isActive })}
      extraError={categories.error ?? brands.error}
    />
  );
}
