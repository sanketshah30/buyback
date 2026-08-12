import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { OptionList } from '../../components/ui/OptionList';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { useBuyback } from '../../hooks/useBuyback';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';
import { catalogApi } from '../../lib/catalogApi';
import type { Question, QuestionnaireAnswer } from '../../types/api';

export function QuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useBuyback(id);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!data?.category) return;
    catalogApi.listQuestions(data.category.id).then(setQuestions);
  }, [data?.category]);

  if (loading) return <PageShell title="Questionnaire"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Questionnaire"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

  const allAnswered = questions.every((q) => (answers[q.id]?.length ?? 0) > 0);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: QuestionnaireAnswer[] = questions.map((q) => ({
        questionId: q.id,
        optionIds: answers[q.id] ?? [],
      }));
      await buybackApi.submitQuestionnaire(id, payload);
      navigate(`/buyback/${id}/valuation`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit questionnaire');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Physical assessment"
      subtitle="Answer the following questions about your device"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={!allAnswered || questions.length === 0}>
            Continue
          </Button>
        </>
      }
    >
      <ProgressSteps current={5} total={10} />

      <div className="field-group">
        {questions.map((question) => {
          const noneOption = question.options.find((o) => o.id === 'none' || o.label.toLowerCase().startsWith('none'));
          return (
            <div key={question.id}>
              <h3 className="question-label">{question.text}</h3>
              <OptionList
                options={question.options}
                multi={question.type === 'multi-choice'}
                selectedIds={answers[question.id] ?? []}
                onChange={(ids) => setAnswers((prev) => ({ ...prev, [question.id]: ids }))}
                exclusiveOptionId={question.type === 'multi-choice' ? noneOption?.id : undefined}
              />
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
