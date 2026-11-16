import { ResourcePage } from '../../components/admin/ResourcePage';
import { brandsApi, categoriesApi, depreciationConfigApi, depreciationMatrixApi, partnersApi, questionAnswersApi } from '../../lib/adminApi';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import type { FieldDef, FormValues } from '../../components/admin/FormFields';
import type { DepreciationMatrixEntry, DepreciationType } from '../../types/api';

const s = (v: FormValues, key: string) => String(v[key] ?? '').trim();

export function DepreciationMatrixPage() {
  const configs = useAdminLookup(() => depreciationConfigApi.search(), 'depreciation configs');
  const categories = useAdminLookup(() => categoriesApi.search(), 'categories');
  const brands = useAdminLookup(() => brandsApi.search(), 'brands');
  const vendors = useAdminLookup(() => partnersApi.search({ partnerType: 'vendor' }), 'vendors');
  const questionAnswers = useAdminLookup(() => questionAnswersApi.search({ isActive: true }), 'question-answer options');

  const categoryName = nameResolver(categories.items, (c) => c.name);
  const brandName = nameResolver(brands.items, (b) => b.name);
  const vendorName = nameResolver(vendors.items, (v) => v.name);
  const configLabel = nameResolver(
    configs.items,
    (c) => `#${c.id} · ${categoryName(c.productCategoryId)} / ${brandName(c.brandId)} / ${vendorName(c.vendorId, 'All vendors')}`,
  );
  const qaLabel = nameResolver(questionAnswers.items, (qa) => `Mapping #${qa.id} (question ${qa.questionId} / answer ${qa.answerId})`);

  const fields = (editing: DepreciationMatrixEntry | null): FieldDef[] => [
    {
      key: 'depreciationConfigId',
      label: 'Depreciation config',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(configs.items, (c) => configLabel(c.id), editing?.depreciationConfigId),
    },
    {
      key: 'questionAnswerId',
      label: 'Question / answer',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: questionAnswers.items.map((qa) => ({ value: String(qa.id), label: qaLabel(qa.id) })),
    },
    {
      key: 'depreciationType',
      label: 'Type',
      kind: 'select',
      required: true,
      options: [
        { value: 'percentage', label: 'Percentage (%)' },
        { value: 'absolute', label: 'Absolute amount' },
      ],
    },
    { key: 'depreciationValue', label: 'Value', kind: 'number', required: true, step: 'any' },
  ];

  const validate = (v: FormValues) => {
    const errors: Record<string, string> = {};
    const value = Number(s(v, 'depreciationValue'));
    if (s(v, 'depreciationValue')) {
      if (Number.isNaN(value) || value < 0) errors.depreciationValue = 'Value must be a non-negative number';
      else if (v.depreciationType === 'percentage' && value > 100) errors.depreciationValue = 'A percentage cannot exceed 100';
    }
    return errors;
  };

  return (
    <ResourcePage<DepreciationMatrixEntry>
      title="Depreciation Matrix"
      entityName="deduction"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'config', header: 'Config', render: (r) => configLabel(r.depreciationConfigId) },
        { key: 'qa', header: 'Question / answer', render: (r) => qaLabel(r.questionAnswerId) },
        { key: 'type', header: 'Type', render: (r) => r.depreciationType },
        {
          key: 'value',
          header: 'Value',
          align: 'right',
          render: (r) => (r.depreciationType === 'percentage' ? `${r.depreciationValue}%` : `₹${r.depreciationValue}`),
        },
      ]}
      load={() => depreciationMatrixApi.search()}
      fields={fields}
      emptyValues={{ depreciationConfigId: '', questionAnswerId: '', depreciationType: 'percentage', depreciationValue: '' }}
      toFormValues={(r) => ({
        depreciationConfigId: String(r.depreciationConfigId),
        questionAnswerId: String(r.questionAnswerId),
        depreciationType: r.depreciationType,
        depreciationValue: String(r.depreciationValue),
      })}
      validate={validate}
      onCreate={(v) =>
        depreciationMatrixApi.create({
          depreciationConfigId: Number(v.depreciationConfigId),
          questionAnswerId: Number(v.questionAnswerId),
          depreciationType: v.depreciationType as DepreciationType,
          depreciationValue: Number(s(v, 'depreciationValue')),
        })
      }
      onUpdate={(row, v) =>
        depreciationMatrixApi.update(row.id, {
          depreciationType: v.depreciationType as DepreciationType,
          depreciationValue: Number(s(v, 'depreciationValue')),
        })
      }
      onSetActive={(row, isActive) => depreciationMatrixApi.update(row.id, { isActive })}
      extraError={configs.error ?? categories.error ?? brands.error ?? vendors.error ?? questionAnswers.error}
    />
  );
}
