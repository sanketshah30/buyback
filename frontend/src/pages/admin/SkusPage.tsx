import { ResourcePage } from '../../components/admin/ResourcePage';
import { productsApi, skusApi } from '../../lib/adminApi';
import { formatDateTime } from '../../lib/adminFormat';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import type { FieldDef } from '../../components/admin/FormFields';
import type { Sku } from '../../types/api';

/**
 * Mirrors `skus` table columns:
 * id, product_id, code, label, created_at, is_active
 */
export function SkusPage() {
  const products = useAdminLookup(() => productsApi.search(), 'products');
  const productName = nameResolver(products.items, (p) => p.name);

  const fields = (editing: Sku | null): FieldDef[] => [
    {
      key: 'productId',
      label: 'product_id',
      kind: 'select',
      required: true,
      options: toOptions(products.items, (p) => `${p.id} — ${p.name}`, editing?.productId),
    },
    { key: 'code', label: 'code', kind: 'text', required: true },
    { key: 'label', label: 'label', kind: 'text', required: true },
  ];

  return (
    <ResourcePage<Sku>
      title="SKUs"
      entityName="SKU"
      columns={[
        { key: 'id', header: 'id', render: (r) => r.id },
        { key: 'code', header: 'SKU', render: (r) => r.code },
        { key: 'productId', header: 'Product', render: (r) => productName(r.productId) },
        { key: 'label', header: 'Label', render: (r) => r.label },
        { key: 'createdAt', header: 'Created At', render: (r) => formatDateTime(r.createdAt) },
      ]}
      load={() => skusApi.search()}
      fields={fields}
      emptyValues={{ productId: '', code: '', label: '' }}
      toFormValues={(r) => ({
        productId: String(r.productId),
        code: r.code,
        label: r.label,
      })}
      onCreate={(v) =>
        skusApi.create({
          productId: Number(v.productId),
          code: String(v.code).trim(),
          label: String(v.label).trim(),
        })
      }
      onUpdate={(row, v) =>
        skusApi.update(row.id, {
          productId: Number(v.productId),
          code: String(v.code).trim(),
          label: String(v.label).trim(),
        })
      }
      onSetActive={(row, isActive) => skusApi.update(row.id, { isActive })}
      extraError={products.error}
    />
  );
}
