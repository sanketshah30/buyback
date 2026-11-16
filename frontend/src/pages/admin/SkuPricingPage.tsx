import { ResourcePage } from '../../components/admin/ResourcePage';
import { partnersApi, skuPricingApi, skusApi } from '../../lib/adminApi';
import { formatDate, toDateInput } from '../../lib/adminFormat';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import type { FieldDef, FormValues } from '../../components/admin/FormFields';
import type { SkuPricing } from '../../types/api';

const s = (v: FormValues, key: string) => String(v[key] ?? '').trim();

export function SkuPricingPage() {
  const vendors = useAdminLookup(() => partnersApi.search({ partnerType: 'vendor' }), 'vendors');
  const skus = useAdminLookup(() => skusApi.search(), 'SKUs');
  const vendorName = nameResolver(vendors.items, (v) => v.name);
  const skuName = nameResolver(skus.items, (k) => `${k.code} - ${k.label}`);

  const fields = (editing: SkuPricing | null): FieldDef[] => [
    {
      key: 'vendorId',
      label: 'Vendor',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(vendors.items, (v) => v.name, editing?.vendorId),
    },
    {
      key: 'skuId',
      label: 'SKU',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(skus.items, (k) => `${k.code} - ${k.label}`, editing?.skuId),
    },
    { key: 'price', label: 'Price', kind: 'number', required: true, step: 'any' },
    { key: 'validFrom', label: 'Valid from', kind: 'date', required: true },
    { key: 'validTo', label: 'Valid to', kind: 'date', hint: 'Leave blank for open-ended pricing.' },
  ];

  const validate = (v: FormValues) => {
    const errors: Record<string, string> = {};
    const price = Number(s(v, 'price'));
    if (s(v, 'price') && (Number.isNaN(price) || price < 0)) errors.price = 'Price must be a non-negative number';
    if (s(v, 'validFrom') && s(v, 'validTo') && s(v, 'validTo') <= s(v, 'validFrom')) errors.validTo = 'Valid to must be after valid from';
    return errors;
  };

  return (
    <ResourcePage<SkuPricing>
      title="SKU Pricing"
      entityName="price"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'vendor', header: 'Vendor', render: (r) => vendorName(r.vendorId) },
        { key: 'sku', header: 'SKU', render: (r) => skuName(r.skuId) },
        { key: 'price', header: 'Price', align: 'right', render: (r) => `₹${r.price}` },
        { key: 'from', header: 'Valid from', render: (r) => formatDate(r.validFrom) },
        { key: 'to', header: 'Valid to', render: (r) => (r.validTo ? formatDate(r.validTo) : 'Open-ended') },
      ]}
      load={() => skuPricingApi.search()}
      fields={fields}
      emptyValues={{ vendorId: '', skuId: '', price: '', validFrom: '', validTo: '' }}
      toFormValues={(r) => ({
        vendorId: String(r.vendorId),
        skuId: String(r.skuId),
        price: String(r.price),
        validFrom: toDateInput(r.validFrom),
        validTo: toDateInput(r.validTo),
      })}
      validate={validate}
      onCreate={(v) =>
        skuPricingApi.create({
          vendorId: Number(v.vendorId),
          skuId: Number(v.skuId),
          price: Number(s(v, 'price')),
          validFrom: s(v, 'validFrom'),
          validTo: s(v, 'validTo') || undefined,
        })
      }
      onUpdate={(row, v) =>
        skuPricingApi.update(row.id, { price: Number(s(v, 'price')), validFrom: s(v, 'validFrom'), validTo: s(v, 'validTo') || null })
      }
      onSetActive={(row, isActive) => skuPricingApi.update(row.id, { isActive })}
      extraError={vendors.error ?? skus.error}
    />
  );
}
