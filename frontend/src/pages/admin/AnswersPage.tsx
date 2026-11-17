import { ResourcePage } from '../../components/admin/ResourcePage';
import { answersApi } from '../../lib/adminApi';
import { formatDateTime } from '../../lib/adminFormat';
import type { FieldDef } from '../../components/admin/FormFields';
import type { MasterAnswer } from '../../types/api';

const FIELDS: FieldDef[] = [
  {
    key: 'code',
    label: 'Code',
    kind: 'text',
    required: true,
    hint: 'Stable language-independent key (e.g. yes, poor).',
  },
  {
    key: 'text',
    label: 'Text (English)',
    kind: 'text',
    required: true,
    hint: 'Stored as the English answer translation.',
  },
];

export function AnswersPage() {
  return (
    <ResourcePage<MasterAnswer>
      title="Answers"
      entityName="answer"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'code', header: 'Code', render: (r) => r.code },
        { key: 'text', header: 'Text', render: (r) => r.text || '—' },
        { key: 'createdAt', header: 'Created At', render: (r) => formatDateTime(r.createdAt) },
      ]}
      load={() => answersApi.search()}
      fields={() => FIELDS}
      emptyValues={{ code: '', text: '' }}
      toFormValues={(r) => ({ code: r.code, text: r.text ?? '' })}
      onCreate={(v) =>
        answersApi.create({
          code: String(v.code ?? '').trim(),
          text: String(v.text ?? '').trim(),
        })
      }
      onUpdate={(row, v) =>
        answersApi.update(row.id, {
          code: String(v.code ?? '').trim(),
          text: String(v.text ?? '').trim(),
        })
      }
      onSetActive={(row, isActive) => answersApi.update(row.id, { isActive })}
    />
  );
}
