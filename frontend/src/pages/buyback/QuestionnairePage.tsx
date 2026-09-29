import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { OptionList } from '../../components/ui/OptionList';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../lib/auth';
import { useBuybackDraft } from '../../lib/buybackDraft';
import { questionnaireConfigApi } from '../../lib/questionnaireConfigApi';
import type { QuestionnaireAnswer, ResolvedQuestionnaireQuestion } from '../../types/api';

export function QuestionnairePage() {
  const navigate = useNavigate();
  const { partnerId } = useAuth();
  const { draft, setQuestionnaireAnswers } = useBuybackDraft();

  const [questions, setQuestions] = useState<ResolvedQuestionnaireQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  // Keyed by questionId; values are the selected questionAnswerId(s) as strings (the OptionList control's native currency).
  const [answers, setAnswers] = useState<Record<number, string[]>>({});

  useEffect(() => {
    if (!draft.category || !draft.brand) {
      navigate('/buyback/new', { replace: true });
      return;
    }
    // Resolved per (category, brand, our own retail partner) - see
    // "Questionnaire configuration module" in server/README.md.
    questionnaireConfigApi
      .resolve(draft.category.id, draft.brand.id, partnerId ?? undefined)
      .then((res) => setQuestions(res.questions))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.category, draft.brand]);

  if (loading) return <PageShell title="Questionnaire"><Spinner /></PageShell>;

  const allAnswered = questions.every((q) => (answers[q.questionId]?.length ?? 0) > 0);

  const handleSubmit = () => {
    const payload: QuestionnaireAnswer[] = questions.map((q) => ({
      questionId: q.questionId,
      questionAnswerIds: (answers[q.questionId] ?? []).map(Number),
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
        {questions.length === 0 && (
          <p className="question-label">No questionnaire is configured for this category/brand yet.</p>
        )}
        {questions.map((question) => (
          <div key={question.questionId}>
            <h3 className="question-label">{question.text}</h3>
            <OptionList
              options={question.answers.map((a) => ({ id: String(a.questionAnswerId), label: a.text }))}
              multi={question.type === 'multi-choice'}
              selectedIds={answers[question.questionId] ?? []}
              onChange={(ids) => setAnswers((prev) => ({ ...prev, [question.questionId]: ids }))}
            />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
