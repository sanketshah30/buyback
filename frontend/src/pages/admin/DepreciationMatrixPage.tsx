import { useCallback, useMemo, useState } from 'react';
import { ResourcePage } from '../../components/admin/ResourcePage';
import { brandsApi, categoriesApi, depreciationConfigApi, depreciationMatrixApi, partnersApi, questionAnswersApi } from '../../lib/adminApi';
import { formatDate } from '../../lib/adminFormat';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import { Select } from '../../components/ui/Select';
import type { FieldDef, FormValues } from '../../components/admin/FormFields';
import type { DepreciationConfig, DepreciationMatrixEntry, DepreciationType } from '../../types/api';
import './DepreciationMatrixPage.css';

const s = (v: FormValues, key: string) => String(v[key] ?? '').trim();

type MatrixRow = DepreciationMatrixEntry & {
  validFrom: string;
  validTo?: string;
};

function preferOpenConfig(configs: DepreciationConfig[]): DepreciationConfig | undefined {
  const open = configs.find((c) => c.isActive && !c.validTo);
  return open ?? configs.find((c) => c.isActive) ?? configs[0];
}

export function DepreciationMatrixPage() {
  const categories = useAdminLookup(() => categoriesApi.search(), 'categories');
  const brands = useAdminLookup(() => brandsApi.search(), 'brands');
  const vendors = useAdminLookup(() => partnersApi.search({ partnerType: 'vendor' }), 'vendors');
  const questionAnswers = useAdminLookup(() => questionAnswersApi.search({ isActive: true }), 'question-answer options');

  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [listVersion, setListVersion] = useState(0);

  const questionText = nameResolver(
    questionAnswers.items,
    (qa) => qa.questionText ?? `Question #${qa.questionId}`,
  );
  const answerText = nameResolver(
    questionAnswers.items,
    (qa) => qa.answerText ?? qa.answerCode ?? `Answer #${qa.answerId}`,
  );

  const questionOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const qa of questionAnswers.items) {
      if (!seen.has(qa.questionId)) {
        seen.set(qa.questionId, qa.questionText ?? `Question #${qa.questionId}`);
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ value: String(id), label }));
  }, [questionAnswers.items]);

  const load = useCallback(async (): Promise<MatrixRow[]> => {
    const [configs, entries] = await Promise.all([
      depreciationConfigApi.search({
        ...(categoryFilter ? { productCategoryId: Number(categoryFilter) } : {}),
        ...(brandFilter ? { brandId: Number(brandFilter) } : {}),
        ...(vendorFilter === ''
          ? {}
          : vendorFilter === '__null__'
            ? { vendorId: null }
            : { vendorId: Number(vendorFilter) }),
      }),
      depreciationMatrixApi.search({}),
    ]);
    if (configs.length === 0) return [];

    const configById = new Map(configs.map((c) => [c.id, c]));
    return entries
      .filter((row) => configById.has(row.depreciationConfigId))
      .map((row) => {
        const config = configById.get(row.depreciationConfigId)!;
        return {
          ...row,
          validFrom: config.validFrom,
          validTo: config.validTo,
        };
      });
  }, [categoryFilter, brandFilter, vendorFilter]);

  const fields = (editing: MatrixRow | null, values: FormValues): FieldDef[] => {
    const selectedQuestionId = s(values, 'questionId');
    const editQuestionId = editing
      ? questionAnswers.items.find((qa) => qa.id === editing.questionAnswerId)?.questionId
      : undefined;

    return [
      {
        key: 'productCategoryId',
        label: 'Category',
        kind: 'select',
        required: true,
        mode: 'create',
        options: toOptions(categories.items, (c) => c.name),
      },
      {
        key: 'brandId',
        label: 'Brand',
        kind: 'select',
        required: true,
        mode: 'create',
        options: toOptions(brands.items, (b) => b.name),
      },
      {
        key: 'vendorId',
        label: 'Vendor',
        kind: 'select',
        mode: 'create',
        placeholder: 'All vendors',
        options: [{ value: '', label: 'All vendors' }, ...toOptions(vendors.items, (v) => v.name)],
      },
      {
        key: 'questionId',
        label: 'Question',
        kind: 'select',
        required: true,
        readOnlyOnEdit: true,
        options: questionOptions.filter((o) => !editQuestionId || o.value === String(editQuestionId)),
      },
      {
        key: 'questionAnswerId',
        label: 'Answer',
        kind: 'select',
        required: true,
        readOnlyOnEdit: true,
        options: questionAnswers.items
          .filter((qa) => {
            if (editing) return qa.id === editing.questionAnswerId;
            return !selectedQuestionId || String(qa.questionId) === selectedQuestionId;
          })
          .map((qa) => ({
            value: String(qa.id),
            label: qa.answerText ?? qa.answerCode ?? `Answer #${qa.answerId}`,
          })),
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
  };

  const validate = (v: FormValues) => {
    const errors: Record<string, string> = {};
    const value = Number(s(v, 'depreciationValue'));
    if (s(v, 'depreciationValue')) {
      if (Number.isNaN(value) || value < 0) errors.depreciationValue = 'Value must be a non-negative number';
      else if (v.depreciationType === 'percentage' && value > 100) {
        errors.depreciationValue = 'A percentage cannot exceed 100';
      }
    }
    const qa = questionAnswers.items.find((item) => String(item.id) === s(v, 'questionAnswerId'));
    if (s(v, 'questionId') && qa && String(qa.questionId) !== s(v, 'questionId')) {
      errors.questionAnswerId = 'Answer must belong to the selected question';
    }
    return errors;
  };

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'All categories' }, ...categories.items.map((c) => ({ value: String(c.id), label: c.name }))],
    [categories.items],
  );
  const brandOptions = useMemo(
    () => [{ value: '', label: 'All brands' }, ...brands.items.map((b) => ({ value: String(b.id), label: b.name }))],
    [brands.items],
  );
  const vendorOptions = useMemo(
    () => [
      { value: '', label: 'All vendors' },
      { value: '__null__', label: 'Wildcard (any vendor)' },
      ...vendors.items.map((v) => ({ value: String(v.id), label: v.name })),
    ],
    [vendors.items],
  );

  return (
    <ResourcePage<MatrixRow>
      title="Depreciation Matrix"
      entityName="deduction"
      reloadKey={`${listVersion}|${categoryFilter}|${brandFilter}|${vendorFilter}`}
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'question', header: 'Question', render: (r) => questionText(r.questionAnswerId) },
        { key: 'answer', header: 'Answer', render: (r) => answerText(r.questionAnswerId) },
        {
          key: 'value',
          header: 'Value',
          align: 'right',
          render: (r) => (r.depreciationType === 'percentage' ? `${r.depreciationValue}%` : `₹${r.depreciationValue}`),
        },
        { key: 'from', header: 'Valid From', render: (r) => formatDate(r.validFrom) },
        { key: 'to', header: 'Valid To', render: (r) => (r.validTo ? formatDate(r.validTo) : 'Null') },
      ]}
      load={load}
      fields={fields}
      emptyValues={{
        productCategoryId: categoryFilter || '',
        brandId: brandFilter || '',
        vendorId: vendorFilter && vendorFilter !== '__null__' ? vendorFilter : '',
        questionId: '',
        questionAnswerId: '',
        depreciationType: 'percentage',
        depreciationValue: '',
      }}
      toFormValues={(r) => {
        const qa = questionAnswers.items.find((item) => item.id === r.questionAnswerId);
        return {
          productCategoryId: '',
          brandId: '',
          vendorId: '',
          questionId: qa ? String(qa.questionId) : '',
          questionAnswerId: String(r.questionAnswerId),
          depreciationType: r.depreciationType,
          depreciationValue: String(r.depreciationValue),
        };
      }}
      validate={validate}
      onCreate={async (v) => {
        const productCategoryId = Number(v.productCategoryId);
        const brandId = Number(v.brandId);
        const vendorId = s(v, 'vendorId') ? Number(s(v, 'vendorId')) : null;
        const entry = {
          questionAnswerId: Number(s(v, 'questionAnswerId')),
          depreciationType: v.depreciationType as DepreciationType,
          depreciationValue: Number(s(v, 'depreciationValue')),
        };

        const matching = await depreciationConfigApi.search({
          productCategoryId,
          brandId,
          vendorId,
          isActive: true,
        });
        const exact = matching.filter((c) => (c.vendorId ?? null) === vendorId);
        const config = preferOpenConfig(exact);

        if (config) {
          await depreciationMatrixApi.create({
            depreciationConfigId: config.id,
            ...entry,
          });
        } else {
          await depreciationConfigApi.create({
            productCategoryId,
            brandId,
            vendorId: vendorId ?? undefined,
            entries: [entry],
          });
        }
        setListVersion((n) => n + 1);
      }}
      onUpdate={(row, v) =>
        depreciationMatrixApi.update(row.id, {
          depreciationType: v.depreciationType as DepreciationType,
          depreciationValue: Number(s(v, 'depreciationValue')),
        })
      }
      onSetActive={(row, isActive) => depreciationMatrixApi.update(row.id, { isActive })}
      extraError={categories.error ?? brands.error ?? vendors.error ?? questionAnswers.error}
      toolbarExtra={
        <div className="depreciation-matrix-filters">
          <Select
            label="Category"
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All categories"
          />
          <Select
            label="Brand"
            options={brandOptions}
            value={brandFilter}
            onChange={setBrandFilter}
            placeholder="All brands"
          />
          <Select
            label="Vendor"
            options={vendorOptions}
            value={vendorFilter}
            onChange={setVendorFilter}
            placeholder="All vendors"
          />
        </div>
      }
    />
  );
}
