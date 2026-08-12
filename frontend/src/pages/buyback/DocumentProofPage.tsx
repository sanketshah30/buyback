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
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageShell title="Document &amp; device proof"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Document &amp; device proof"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

  const needsProductImages = data.assessmentMethod === 'questionnaire';
  const filledImageCount = Object.values(productImages).filter(Boolean).length;
  const canSubmit = Boolean(document) && (!needsProductImages || filledImageCount > 0);

  const handleSubmit = async () => {
    if (!id || !document) return;
    setSubmitting(true);
    setError(null);
    try {
      await buybackApi.uploadDocument(id, document);
      if (needsProductImages) {
        const selected = SIDES.map((side) => productImages[side.id]).filter((f): f is File => Boolean(f));
        await buybackApi.uploadProductImages(id, selected);
      }
      navigate(`/buyback/${id}/review`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload documents/images');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Document &amp; device proof"
      subtitle={
        needsProductImages
          ? 'Upload a document proof and 6-side device images'
          : 'Upload a document proof for verification'
      }
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            Continue to review
          </Button>
        </>
      }
    >
      <ProgressSteps current={9} total={10} />

      <section>
        <h3 className="section-label">Document proof</h3>
        <label className="upload-slot" style={{ aspectRatio: 'auto', height: 180 }}>
          {document ? (
            <img src={URL.createObjectURL(document)} alt="Document proof" />
          ) : (
            <span style={{ fontSize: '2rem' }}>🪪</span>
          )}
          <span className="upload-slot__label">{document ? document.name : 'Tap to capture/upload a government ID or invoice'}</span>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => setDocument(e.target.files?.[0] ?? null)} />
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
                    <span style={{ fontSize: '1.6rem' }}>📷</span>
                  )}
                  <span className="upload-slot__label">{side.label}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setProductImages((prev) => ({ ...prev, [side.id]: e.target.files?.[0] ?? null }))}
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}
    </PageShell>
  );
}
