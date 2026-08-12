import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { useCameraPermission } from '../../hooks/useCameraPermission';
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

export function ImageAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: permissionState, requestAccess } = useCameraPermission();
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filledCount = Object.values(files).filter(Boolean).length;

  const handleFileChange = (sideId: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [sideId]: file }));
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      const selected = SIDES.map((side) => files[side.id]).filter((f): f is File => Boolean(f));
      await buybackApi.submitImages(id, selected);
      navigate(`/buyback/${id}/valuation`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload images');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Image-based assessment"
      subtitle="Capture all 6 sides of the device for AI analysis"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={filledCount === 0}>
            Run AI assessment ({filledCount}/6)
          </Button>
        </>
      }
    >
      <ProgressSteps current={3} total={7} />

      {permissionState !== 'granted' && (
        <Banner tone="warning">
          We need camera access to capture device photos.{' '}
          <button
            type="button"
            onClick={requestAccess}
            style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
          >
            Enable camera
          </button>
        </Banner>
      )}

      <div className="upload-grid">
        {SIDES.map((side) => {
          const file = files[side.id];
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
                onChange={(e) => handleFileChange(side.id, e.target.files?.[0] ?? null)}
              />
            </label>
          );
        })}
      </div>
    </PageShell>
  );
}
