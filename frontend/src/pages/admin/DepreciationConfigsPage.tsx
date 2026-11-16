import { DepreciationEntriesEditor } from '../../components/admin/DepreciationEntriesEditor';
import { ResourcePage } from '../../components/admin/ResourcePage';
import { brandsApi, categoriesApi, depreciationConfigApi, partnersApi, questionAnswersApi } from '../../lib/adminApi';
import { EMPTY_ENTRY, formatDate, toDateInput } from '../../lib/adminFormat';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import type { EntryRow, FieldDef, FormValues } from '../../components/admin/FormFields';
import type { DepreciationConfig, DepreciationType } from '../../types/api';

export function DepreciationConfigsPage() {
  const categories = useAdminLookup(() => categoriesApi.search(), 'categories');
  const brands = useAdminLookup(() => brandsApi.search(), 'brands');
  const vendors = useAdminLookup(() => partnersApi.search({ partnerType: 'vendor' }), 'vendors');
  const questionAnswers = useAdminLookup(() => questionAnswersApi.search({ isActive: true }), 'question-answer options');
  const categoryName = nameResolver(categories.items, (c) => c.name);
  const brandName = nameResolver(brands.items, (b) => b.name);
  const vendorName = nameResolver(vendors.items, (v) => v.name);

  const qaOptions = questionAnswers.items.map((qa) => ({
    value: String(qa.id),
    label: `Mapping #${qa.id} (question ${qa.questionId} / answer ${qa.answerId})`,
  }));

  const fields = (editing: DepreciationConfig | null): FieldDef[] => [
    {
      key: 'productCategoryId',
      label: 'Category',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(categories.items, (c) => c.name, editing?.productCategoryId),
    },
    {
      key: 'brandId',
      label: 'Brand',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(brands.items, (b) => b.name, editing?.brandId),
    },
    {
      key: 'vendorId',
      label: 'Vendor',
      kind: 'select',
      readOnlyOnEdit: true,
      placeholder: 'All vendors',
      options: [{ value: '', label: 'All vendors' }, ...toOptions(vendors.items, (v) => v.name, editing?.vendorId)],
    },
    {
      key: 'entries',
      label: 'Deductions',
      kind: 'custom',
      mode: 'create',
      render: (value, onChange, error) => (
        <DepreciationEntriesEditor
          rows={Array.isArray(value) && value.length > 0 ? (value as EntryRow[]) : [{ ...EMPTY_ENTRY }]}
          questionAnswerOptions={qaOptions}
          onChange={onChange}
          error={error}
        />
      ),
    },
    {
      key: 'validTo',
      label: 'Valid to',
      kind: 'date',
      mode: 'edit',
      hint: 'Close the set on this date, or leave blank for open-ended.',
    },
  ];

  const validate = (v: FormValues, mode: 'create' | 'edit') => {
    const errors: Record<string, string> = {};
    if (mode !== 'create') return errors;
    const rows = (Array.isArray(v.entries) ? v.entries : []) as EntryRow[];
    const seen = new Set<string>();
    for (const row of rows) {
      const value = Number(row.depreciationValue);
      if (!row.questionAnswerId) errors.entries = 'Choose a question/answer for every deduction';
      else if (seen.has(row.questionAnswerId)) errors.entries = 'Each question/answer can only appear once';
      else if (row.depreciationValue === '' || Number.isNaN(value) || value < 0) errors.entries = 'Enter a non-negative value for every deduction';
      else if (row.depreciationType === 'percentage' && value > 100) errors.entries = 'A percentage cannot exceed 100';
      seen.add(row.questionAnswerId);
    }
    if (rows.length === 0) errors.entries = 'Add at least one deduction';
    return errors;
  };

  return (
    <ResourcePage<DepreciationConfig>
      title="Depreciation Configs"
      entityName="depreciation config"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'category', header: 'Category', render: (r) => categoryName(r.productCategoryId) },
        { key: 'brand', header: 'Brand', render: (r) => brandName(r.brandId) },
        { key: 'vendor', header: 'Vendor', render: (r) => vendorName(r.vendorId, 'All vendors') },
        { key: 'from', header: 'Valid from', render: (r) => formatDate(r.validFrom) },
        { key: 'to', header: 'Valid to', render: (r) => (r.validTo ? formatDate(r.validTo) : 'Open-ended') },
      ]}
      load={() => depreciationConfigApi.search()}
      fields={fields}
      emptyValues={{ productCategoryId: '', brandId: '', vendorId: '', entries: [{ ...EMPTY_ENTRY }], validTo: '' }}
      toFormValues={(r) => ({
        productCategoryId: String(r.productCategoryId),
        brandId: String(r.brandId),
        vendorId: r.vendorId === null ? '' : String(r.vendorId),
        entries: [],
        validTo: toDateInput(r.validTo),
      })}
      validate={validate}
      onCreate={(v) =>
        depreciationConfigApi.create({
          productCategoryId: Number(v.productCategoryId),
          brandId: Number(v.brandId),
          vendorId: v.vendorId ? Number(v.vendorId) : undefined,
          entries: (v.entries as EntryRow[]).map((row) => ({
            questionAnswerId: Number(row.questionAnswerId),
            depreciationType: row.depreciationType as DepreciationType,
            depreciationValue: Number(row.depreciationValue),
          })),
        })
      }
      // Only validTo/isActive can change on an existing set - individual deductions are edited in the Depreciation Matrix.
      onUpdate={(row, v) => depreciationConfigApi.update(row.id, { validTo: String(v.validTo ?? '').trim() || null })}
      onSetActive={(row, isActive) => depreciationConfigApi.update(row.id, { isActive })}
      extraError={categories.error ?? brands.error ?? vendors.error ?? questionAnswers.error}
    />
  );
}
