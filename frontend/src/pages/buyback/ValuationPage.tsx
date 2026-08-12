import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { useBuyback } from '../../hooks/useBuyback';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';
import { useBuybackDraft } from '../../lib/buybackDraft';
import type { BuybackRequest } from '../../types/api';

export function ValuationPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { draft, submit } = useBuybackDraft();

  // No :id yet means this is the first visit right after finishing the assessment step -
  // this is the single point where a real buyback record (and its reference ID) gets
  // created on the server, by replaying everything captured so far in one go.
  const isFreshSubmission = !id;

  const [submittingDraft, setSubmittingDraft] = useState(isFreshSubmission);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [freshResult, setFreshResult] = useState<BuybackRequest | null>(null);
  // Guards against React StrictMode's intentional double-invocation of effects in
  // development, which would otherwise fire submit() twice and create two separate
  // buyback records for a single "Continue" click.
  const submitStartedRef = useRef(false);

  useEffect(() => {
    if (!isFreshSubmission || submitStartedRef.current) return;
    if (!draft.category || !draft.brand || !draft.identifier || !draft.model || !draft.sku || !draft.assessmentMethod) {
      navigate('/buyback/new', { replace: true });
      return;
    }
    submitStartedRef.current = true;
    submit()
      .then((result) => {
        setFreshResult(result);
        setSubmittingDraft(false);
        navigate(`/buyback/${result.id}/valuation`, { replace: true });
      })
      .catch((err) => {
        setSubmitError(err instanceof ApiError ? err.message : 'Failed to calculate your device value');
        setSubmittingDraft(false);
        submitStartedRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreshSubmission]);

  const { data, loading } = useBuyback(id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveData = freshResult ?? data;

  if (isFreshSubmission) {
    return (
      <PageShell title="Valuation" showBack={false}>
        {submitError ? (
          <Banner tone="error">{submitError}</Banner>
        ) : (
          <Spinner label="Calculating your device's max value…" />
        )}
      </PageShell>
    );
  }

  if (loading || submittingDraft) return <PageShell title="Valuation"><Spinner label="Calculating your device's max value…" /></PageShell>;
  if (!effectiveData) return <PageShell title="Valuation"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

  const handleWithoutDiagnosis = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await buybackApi.finalizeWithoutDiagnosis(id);
      navigate(`/buyback/${id}/customer`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to finalize value');
    } finally {
      setBusy(false);
    }
  };

  const handleWithDiagnosis = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await buybackApi.initiateDiagnosis(id);
      navigate(`/buyback/${id}/diagnosis`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start diagnosis');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title="Estimated value" subtitle={`Buyback ID: ${effectiveData.displayId ?? '—'}`}>
      <ProgressSteps current={4} total={7} />

      <div className="value-hero">
        <span className="value-hero__label">Max value</span>
        <span className="value-hero__amount">₹{effectiveData.maxValue}</span>
      </div>

      <Banner tone="warning">
        This value assumes there are no functional issues with the device. The final value may change based on
        diagnosis.
      </Banner>

      {error && <Banner tone="error">{error}</Banner>}

      <div className="field-group" style={{ marginTop: 'auto' }}>
        <Button onClick={handleWithDiagnosis} loading={busy} disabled={busy}>
          Continue with diagnosis
        </Button>
        <Button variant="secondary" onClick={handleWithoutDiagnosis} loading={busy} disabled={busy}>
          Continue without diagnosis
        </Button>
      </div>
    </PageShell>
  );
}
