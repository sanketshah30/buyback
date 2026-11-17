import { useCallback, useMemo, useState } from 'react';
import { ResourcePage } from '../../components/admin/ResourcePage';
import {
  brandsApi,
  categoriesApi,
  partnersApi,
  questionAnswersApi,
  questionnaireConfigApi,
} from '../../lib/adminApi';
import { formatDateTime } from '../../lib/adminFormat';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import { Select } from '../../components/ui/Select';
import type { FieldDef, FormValues } from '../../components/admin/FormFields';
import type { QuestionnaireConfig } from '../../types/api';
import './QuestionnaireConfigPage.css';

const s = (v: FormValues, key: string) => String(v[key] ?? '').trim();

export function QuestionnaireConfigPage() {
  const categories = useAdminLookup(() => categoriesApi.search(), 'categories');
  const brands = useAdminLookup(() => brandsApi.search(), 'brands');
  const partners = useAdminLookup(() => partnersApi.search(), 'partners');
  const questionAnswers = useAdminLookup(() => questionAnswersApi.search({ isActive: true }), 'question answers');

  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');

  const categoryName = nameResolver(categories.items, (c) => c.name);
  const brandName = nameResolver(brands.items, (b) => b.name);
  const partnerName = nameResolver(partners.items, (p) => p.name);
  const qaLabel = nameResolver(
    questionAnswers.items,
    (qa) => `${qa.questionText ?? `Q#${qa.questionId}`} → ${qa.answerText ?? qa.answerCode ?? `A#${qa.answerId}`}`,
  );

  const load = useCallback(() => {
    return questionnaireConfigApi.search({
      ...(categoryFilter ? { productCategoryId: Number(categoryFilter) } : {}),
      ...(brandFilter === ''
        ? {}
        : brandFilter === '__null__'
          ? { brandId: null }
          : { brandId: Number(brandFilter) }),
      ...(partnerFilter === ''
        ? {}
        : partnerFilter === '__null__'
          ? { partnerId: null }
          : { partnerId: Number(partnerFilter) }),
    });
  }, [categoryFilter, brandFilter, partnerFilter]);

  const fields = (editing: QuestionnaireConfig | null): FieldDef[] => [
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
      readOnlyOnEdit: true,
      placeholder: 'All brands',
      options: [
        { value: '', label: 'All brands' },
        ...toOptions(brands.items, (b) => b.name, editing?.brandId),
      ],
    },
    {
      key: 'partnerId',
      label: 'Partner',
      kind: 'select',
      readOnlyOnEdit: true,
      placeholder: 'All partners',
      options: [
        { value: '', label: 'All partners' },
        ...toOptions(partners.items, (p) => p.name, editing?.partnerId),
      ],
    },
    {
      key: 'questionAnswerId',
      label: 'Question / answer',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: questionAnswers.items.map((qa) => ({
        value: String(qa.id),
        label: `${qa.questionText ?? `Q#${qa.questionId}`} → ${qa.answerText ?? qa.answerCode ?? `A#${qa.answerId}`}`,
      })),
    },
    {
      key: 'sequence',
      label: 'Sequence',
      kind: 'number',
      required: true,
      hint: 'Display order of the question within this config tier.',
    },
  ];

  const validate = (v: FormValues) => {
    const errors: Record<string, string> = {};
    const sequence = Number(s(v, 'sequence'));
    if (s(v, 'sequence') && (Number.isNaN(sequence) || sequence < 1 || !Number.isInteger(sequence))) {
      errors.sequence = 'Sequence must be a positive integer';
    }
    return errors;
  };

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'All categories' }, ...categories.items.map((c) => ({ value: String(c.id), label: c.name }))],
    [categories.items],
  );
  const brandOptions = useMemo(
    () => [
      { value: '', label: 'All brands' },
      { value: '__null__', label: 'Wildcard (any brand)' },
      ...brands.items.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [brands.items],
  );
  const partnerOptions = useMemo(
    () => [
      { value: '', label: 'All partners' },
      { value: '__null__', label: 'Wildcard (any partner)' },
      ...partners.items.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [partners.items],
  );

  return (
    <ResourcePage<QuestionnaireConfig>
      title="Questionnaire Config"
      entityName="questionnaire config"
      reloadKey={`${categoryFilter}|${brandFilter}|${partnerFilter}`}
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'category', header: 'Category', render: (r) => categoryName(r.productCategoryId) },
        { key: 'brand', header: 'Brand', render: (r) => brandName(r.brandId, 'All brands') },
        { key: 'partner', header: 'Partner', render: (r) => partnerName(r.partnerId, 'All partners') },
        { key: 'qa', header: 'Question / Answer', render: (r) => qaLabel(r.questionAnswerId) },
        { key: 'sequence', header: 'Sequence', align: 'right', render: (r) => r.sequence },
        { key: 'createdAt', header: 'Created At', render: (r) => formatDateTime(r.createdAt) },
      ]}
      load={load}
      fields={fields}
      emptyValues={{
        productCategoryId: categoryFilter || '',
        brandId: brandFilter && brandFilter !== '__null__' ? brandFilter : '',
        partnerId: partnerFilter && partnerFilter !== '__null__' ? partnerFilter : '',
        questionAnswerId: '',
        sequence: '1',
      }}
      toFormValues={(r) => ({
        productCategoryId: String(r.productCategoryId),
        brandId: r.brandId === null ? '' : String(r.brandId),
        partnerId: r.partnerId === null ? '' : String(r.partnerId),
        questionAnswerId: String(r.questionAnswerId),
        sequence: String(r.sequence),
      })}
      validate={validate}
      onCreate={(v) =>
        questionnaireConfigApi.create({
          productCategoryId: Number(v.productCategoryId),
          brandId: s(v, 'brandId') ? Number(s(v, 'brandId')) : null,
          partnerId: s(v, 'partnerId') ? Number(s(v, 'partnerId')) : null,
          questionAnswerId: Number(s(v, 'questionAnswerId')),
          sequence: Number(s(v, 'sequence')),
        })
      }
      onUpdate={(row, v) =>
        questionnaireConfigApi.update(row.id, {
          sequence: Number(s(v, 'sequence')),
        })
      }
      onSetActive={(row, isActive) => questionnaireConfigApi.update(row.id, { isActive })}
      extraError={categories.error ?? brands.error ?? partners.error ?? questionAnswers.error}
      createDisabled={categories.loading || questionAnswers.loading}
      toolbarExtra={
        <div className="questionnaire-config-filters">
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
            label="Partner"
            options={partnerOptions}
            value={partnerFilter}
            onChange={setPartnerFilter}
            placeholder="All partners"
          />
        </div>
      }
    />
  );
}
