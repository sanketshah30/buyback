import { ResourcePage } from '../../components/admin/ResourcePage';
import { answersApi, questionAnswersApi, questionsApi } from '../../lib/adminApi';
import { formatDateTime } from '../../lib/adminFormat';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import type { FieldDef } from '../../components/admin/FormFields';
import type { QuestionAnswerMapping } from '../../types/api';

export function QuestionAnswersPage() {
  const questions = useAdminLookup(() => questionsApi.search(), 'questions');
  const answers = useAdminLookup(() => answersApi.search(), 'answers');

  const questionLabel = nameResolver(questions.items, (q) => q.text || `Question #${q.id}`);
  const answerLabel = nameResolver(answers.items, (a) => `${a.code}${a.text ? ` — ${a.text}` : ''}`);

  const fields = (editing: QuestionAnswerMapping | null): FieldDef[] => [
    {
      key: 'questionId',
      label: 'Question',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(questions.items, (q) => q.text || `Question #${q.id}`, editing?.questionId),
    },
    {
      key: 'answerId',
      label: 'Answer',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(
        answers.items,
        (a) => `${a.code}${a.text ? ` — ${a.text}` : ''}`,
        editing?.answerId,
      ),
    },
  ];

  return (
    <ResourcePage<QuestionAnswerMapping>
      title="Question Answers"
      entityName="question answer"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'question', header: 'Question', render: (r) => r.questionText || questionLabel(r.questionId) },
        {
          key: 'answer',
          header: 'Answer',
          render: (r) => r.answerText || answerLabel(r.answerId),
        },
        { key: 'code', header: 'Code', render: (r) => r.answerCode || '—' },
        { key: 'createdAt', header: 'Created At', render: (r) => formatDateTime(r.createdAt) },
      ]}
      load={() => questionAnswersApi.search()}
      fields={fields}
      emptyValues={{ questionId: '', answerId: '' }}
      toFormValues={(r) => ({
        questionId: String(r.questionId),
        answerId: String(r.answerId),
      })}
      onCreate={(v) =>
        questionAnswersApi.create({
          questionId: Number(v.questionId),
          answerId: Number(v.answerId),
        })
      }
      onUpdate={(row) => questionAnswersApi.update(row.id, {})}
      onSetActive={(row, isActive) => questionAnswersApi.update(row.id, { isActive })}
      extraError={questions.error ?? answers.error}
      createDisabled={questions.loading || answers.loading}
    />
  );
}
