import { ResourcePage } from '../../components/admin/ResourcePage';
import { brandsApi } from '../../lib/adminApi';
import { formatDateTime } from '../../lib/adminFormat';
import type { FieldDef } from '../../components/admin/FormFields';
import type { Brand } from '../../types/api';

/**
 * Mirrors `brands` table columns:
 * id, name, created_at, is_active
 */
const FIELDS: FieldDef[] = [{ key: 'name', label: 'Name', kind: 'text', required: true }];

export function BrandsPage() {
  return (
    <ResourcePage<Brand>
      title="Brands"
      entityName="brand"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'name', header: 'Name', render: (r) => r.name },
        { key: 'createdAt', header: 'Created At', render: (r) => formatDateTime(r.createdAt) },
      ]}
      load={() => brandsApi.search()}
      fields={() => FIELDS}
      emptyValues={{ name: '' }}
      toFormValues={(r) => ({ name: r.name })}
      onCreate={(v) => brandsApi.create({ name: String(v.name).trim() })}
      onUpdate={(row, v) => brandsApi.update(row.id, { name: String(v.name).trim() })}
      onSetActive={(row, isActive) => brandsApi.update(row.id, { isActive })}
    />
  );
}
