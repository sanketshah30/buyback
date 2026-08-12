import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { OptionList } from '../../components/ui/OptionList';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { useBuybackDraft } from '../../lib/buybackDraft';
import { catalogApi } from '../../lib/catalogApi';
import type { Question, QuestionnaireAnswer } from '../../types/api';

export function QuestionnairePage() {
  const navigate = useNavigate();
  const { draft, setQuestionnaireAnswers } = useBuybackDraft();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!draft.category) {
      navigate('/buyback/new', { replace: true });
      return;
    }
    catalogApi
      .listQuestions(draft.category.id)
      .then(setQuestions)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.category]);

  if (loading) return <PageShell title="Questionnaire"><Spinner /></PageShell>;

  const allAnswered = questions.every((q) => (answers[q.id]?.length ?? 0) > 0);

  const handleSubmit = () => {
    const payload: QuestionnaireAnswer[] = questions.map((q) => ({
      questionId: q.id,
      optionIds: answers[q.id] ?? [],
    }));
    setQuestionnaireAnswers(payload);
    navigate('/buyback/new/valuation');
  };

  return (
    <PageShell
      title="Physical assessment"
      subtitle="Answer the following questions about your device"
      footer={
        <Button onClick={handleSubmit} disabled={!allAnswered || questions.length === 0}>
          Continue
        </Button>
      }
    >
      <ProgressSteps current={3} total={7} />

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
