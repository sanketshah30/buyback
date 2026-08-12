import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { useBuyback } from '../../hooks/useBuyback';
import { buybackApi } from '../../lib/buybackApi';

const POLL_INTERVAL_MS = 2500;

export function DiagnosisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, setData, error: loadError } = useBuyback(id);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const status = data?.diagnosis?.status;

  useEffect(() => {
    if (!id || status === 'completed') return undefined;

    intervalRef.current = setInterval(async () => {
      try {
        const updated = await buybackApi.pollDiagnosis(id);
        setData(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check diagnosis status');
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, status, setData]);

  if (loading) return <PageShell title="Diagnosis"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Diagnosis"><Banner tone="error">{loadError ?? 'Buyback request not found.'}</Banner></PageShell>;

  const isCompleted = data.diagnosis?.status === 'completed';

  return (
    <PageShell title="Automated diagnosis" subtitle="Scan the QR code on your device to run the diagnosis">
      <ProgressSteps current={7} total={12} />

      {!isCompleted && data.diagnosis && (
        <>
          <div className="qr-box">
            <QRCodeSVG value={data.diagnosis.qrToken} size={200} bgColor="#ffffff" fgColor="#0a0a0a" />
          </div>
          <div className="diagnosis-status">
            <span className="status-dot" />
            <p>
              {data.diagnosis.status === 'pending' ? 'Waiting for the device to connect…' : 'Diagnosis in progress…'}
            </p>
          </div>
          <Banner tone="info">
            This screen automatically polls for results (mocked in this MVP - no real diagnostics SDK is wired up).
          </Banner>
        </>
      )}

      {isCompleted && (
        <>
          <div className="value-hero">
            <span className="value-hero__label">Final value</span>
            <span className="value-hero__amount">₹{data.finalValue}</span>
          </div>
          {!!data.diagnosis?.findings?.length && (
            <Banner tone="info">Findings: {data.diagnosis.findings.join(' · ')}</Banner>
          )}
          <Button onClick={() => navigate(`/buyback/${id}/customer`)}>Continue</Button>
        </>
      )}

      {error && <Banner tone="error">{error}</Banner>}
    </PageShell>
  );
}
