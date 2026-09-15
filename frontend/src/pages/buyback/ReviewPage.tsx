import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { useBuyback } from '../../hooks/useBuyback';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';
import { catalogApi } from '../../lib/catalogApi';
import type { Question } from '../../types/api';

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useBuyback(id);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!data?.category) return;
    catalogApi.listQuestions(data.category.id).then(setQuestions);
  }, [data?.category]);

  if (loading) return <PageShell title="Review"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Review"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

  const handleConfirm = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      await buybackApi.confirm(id);
      navigate(`/buyback/${id}/success`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to confirm buyback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Review & confirm"
      subtitle={`Buyback ID: ${data.displayId}`}
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleConfirm} loading={submitting}>
            Confirm buyback
          </Button>
        </>
      }
    >
      <ProgressSteps current={7} total={7} />

      <section>
        <h3 className="section-label">Product details</h3>
        <div className="summary-list">
          <div className="summary-row">
            <span className="summary-row__label">Category</span>
            <span className="summary-row__value">{data.category?.name}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Brand / Product</span>
            <span className="summary-row__value">
              {data.brand?.name} {data.product?.name}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">SKU</span>
            <span className="summary-row__value">{data.sku?.label}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">{data.identifier?.type === 'imei' ? 'IMEI' : 'Serial number'}</span>
            <span className="summary-row__value">{data.identifier?.value}</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="section-label">Physical assessment ({data.assessmentMethod})</h3>
        {data.aiAssessment && <Banner tone="info">{data.aiAssessment.summary}</Banner>}
        <div className="summary-list">
          {data.questionnaireAnswers?.map((answer) => {
            const question = questions.find((q) => q.id === answer.questionId);
            const labels = answer.optionIds
              .map((optId) => question?.options.find((o) => o.id === optId)?.label)
              .filter(Boolean)
              .join(', ');
            return (
              <div className="summary-row" key={answer.questionId}>
                <span className="summary-row__label">{question?.text ?? answer.questionId}</span>
                <span className="summary-row__value">{labels}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="section-label">Customer</h3>
        <div className="summary-list">
          <div className="summary-row">
            <span className="summary-row__label">Name</span>
            <span className="summary-row__value">{data.customer?.name}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Email</span>
            <span className="summary-row__value">{data.customer?.email}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Mobile</span>
            <span className="summary-row__value">{data.customer?.mobile}</span>
          </div>
        </div>
      </section>

      <div className="value-hero">
        <span className="value-hero__label">Final buyback value</span>
        <span className="value-hero__amount">₹{data.finalValue}</span>
      </div>
    </PageShell>
  );
}
