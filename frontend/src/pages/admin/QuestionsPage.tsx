import { ResourcePage } from '../../components/admin/ResourcePage';
import { questionsApi } from '../../lib/adminApi';
import { formatDateTime } from '../../lib/adminFormat';
import type { FieldDef } from '../../components/admin/FormFields';
import type { MasterQuestion, QuestionType } from '../../types/api';

const FIELDS: FieldDef[] = [
  {
    key: 'type',
    label: 'Type',
    kind: 'select',
    required: true,
    options: [
      { value: 'single-choice', label: 'Single choice' },
      { value: 'multi-choice', label: 'Multi choice' },
    ],
  },
  {
    key: 'text',
    label: 'Text (English)',
    kind: 'text',
    required: true,
    hint: 'Stored as the English question translation.',
  },
];

export function QuestionsPage() {
  return (
    <ResourcePage<MasterQuestion>
      title="Questions"
      entityName="question"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'text', header: 'Text', render: (r) => r.text || '—' },
        { key: 'type', header: 'Type', render: (r) => r.type },
        { key: 'createdAt', header: 'Created At', render: (r) => formatDateTime(r.createdAt) },
      ]}
      load={() => questionsApi.search()}
      fields={() => FIELDS}
      emptyValues={{ type: 'single-choice', text: '' }}
      toFormValues={(r) => ({ type: r.type, text: r.text ?? '' })}
      onCreate={(v) =>
        questionsApi.create({
          type: v.type as QuestionType,
          text: String(v.text ?? '').trim(),
        })
      }
      onUpdate={(row, v) =>
        questionsApi.update(row.id, {
          type: v.type as QuestionType,
          text: String(v.text ?? '').trim(),
        })
      }
      onSetActive={(row, isActive) => questionsApi.update(row.id, { isActive })}
    />
  );
}
