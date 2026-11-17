import { ResourcePage } from '../../components/admin/ResourcePage';
import { categoriesApi } from '../../lib/adminApi';
import { formatDateTime } from '../../lib/adminFormat';
import type { FieldDef } from '../../components/admin/FormFields';
import type { Category, DeviceCategoryType } from '../../types/api';

/**
 * Mirrors `categories` table columns:
 * id, name, type, created_at, is_active
 * (`type` CHECK: smartphone | non-smartphone)
 */
const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', kind: 'text', required: true },
  {
    key: 'type',
    label: 'Type',
    kind: 'select',
    required: true,
    hint: 'Stored on categories.type (smartphone | non-smartphone).',
    options: [
      { value: 'smartphone', label: 'Smartphone' },
      { value: 'non-smartphone', label: 'Non-smartphone' },
    ],
  },
];

export function CategoriesPage() {
  return (
    <ResourcePage<Category>
      title="Categories"
      entityName="category"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'name', header: 'Name', render: (r) => r.name },
        { key: 'type', header: 'Type', render: (r) => r.type },
        { key: 'createdAt', header: 'Created At', render: (r) => formatDateTime(r.createdAt) },
      ]}
      load={() => categoriesApi.search()}
      fields={() => FIELDS}
      emptyValues={{ name: '', type: '' }}
      toFormValues={(r) => ({ name: r.name, type: r.type })}
      onCreate={(v) =>
        categoriesApi.create({
          name: String(v.name).trim(),
          type: v.type as DeviceCategoryType,
        })
      }
      onUpdate={(row, v) =>
        categoriesApi.update(row.id, {
          name: String(v.name).trim(),
          type: v.type as DeviceCategoryType,
        })
      }
      onSetActive={(row, isActive) => categoriesApi.update(row.id, { isActive })}
    />
  );
}
