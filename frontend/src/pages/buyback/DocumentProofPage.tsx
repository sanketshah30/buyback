import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { useBuyback } from '../../hooks/useBuyback';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';
import './DocumentProofPage.css';

const SIDES = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
];

export function DocumentProofPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useBuyback(id);

  const [document, setDocument] = useState<File | null>(null);
  const [productImages, setProductImages] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageShell title="Document & device proof"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Document & device proof"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

  const needsProductImages = data.assessmentMethod === 'questionnaire';
  const allProductImagesFilled = SIDES.every((side) => Boolean(productImages[side.id]));
  const canSubmit = Boolean(document) && (!needsProductImages || allProductImagesFilled);

  const handleSubmit = async () => {
    if (!id || !document) return;
    if (needsProductImages && !allProductImagesFilled) return;
    setSubmitting(true);
    setError(null);
    setStatus(null);
    try {
      setStatus('Uploading document…');
      await buybackApi.uploadDocument(id, document, (progress) => {
        setStatus(`Uploading document… ${Math.round(progress.percentage)}%`);
      });

      if (needsProductImages) {
        const selected = SIDES.map((side) => productImages[side.id]).filter((f): f is File => Boolean(f));
        await buybackApi.uploadProductImages(id, selected, (index, label, progress) => {
          if ('error' in progress) {
            setError(`${SIDES[index]?.label ?? label}: ${progress.error}`);
            return;
          }
          setStatus(`Uploading ${SIDES[index]?.label ?? label} (${index + 1}/${selected.length})… ${Math.round(progress.percentage)}%`);
        });
      }
      navigate(`/buyback/${id}/review`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to upload documents/images');
    } finally {
      setSubmitting(false);
      setStatus(null);
    }
  };

  return (
    <PageShell
      title="Document & device proof"
      footer={
        <>
          {status && <Banner tone="info">{status}</Banner>}
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            Continue to review
          </Button>
        </>
      }
    >
      <div className="document-proof-page">
        <ProgressSteps current={6} total={7} />

        <section>
          <h3 className="section-label">Document proof</h3>
          <label className="upload-slot document-proof-page__doc">
            {document ? (
              <img src={URL.createObjectURL(document)} alt="Document proof" />
            ) : (
              <span className="document-proof-page__icon">🪪</span>
            )}
            <span className="upload-slot__label">
              {document ? document.name : 'Tap to upload ID or invoice'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
            />
          </label>
        </section>

        {needsProductImages && (
          <section>
            <h3 className="section-label">6-side device images</h3>
            <div className="upload-grid">
              {SIDES.map((side) => {
                const file = productImages[side.id];
                return (
                  <label key={side.id} className={`upload-slot ${file ? 'upload-slot--filled' : ''}`}>
                    {file ? (
                      <img src={URL.createObjectURL(file)} alt={side.label} />
                    ) : (
                      <span className="document-proof-page__icon">📷</span>
                    )}
                    <span className="upload-slot__label">{side.label}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) =>
                        setProductImages((prev) => ({ ...prev, [side.id]: e.target.files?.[0] ?? null }))
                      }
                    />
                  </label>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
