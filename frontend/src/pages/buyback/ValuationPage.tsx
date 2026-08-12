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

export function ValuationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, setData } = useBuyback(id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [valuing, setValuing] = useState(false);

  useEffect(() => {
    if (!id || loading || !data) return;
    if (data.maxValue !== undefined) return;
    setValuing(true);
    buybackApi
      .runValuation(id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to calculate value'))
      .finally(() => setValuing(false));
  }, [id, loading, data, setData]);

  if (loading || valuing) return <PageShell title="Valuation"><Spinner label="Calculating your device's max value…" /></PageShell>;
  if (!data) return <PageShell title="Valuation"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

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
    <PageShell title="Estimated value" subtitle={`Buyback ID: ${data.displayId ?? '—'}`}>
      <ProgressSteps current={6} total={12} />

      <div className="value-hero">
        <span className="value-hero__label">Max value</span>
        <span className="value-hero__amount">₹{data.maxValue}</span>
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
          Continue without diagnosis (-35%)
        </Button>
      </div>
    </PageShell>
  );
}
