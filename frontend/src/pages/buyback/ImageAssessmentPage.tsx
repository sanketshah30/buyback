import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { useBuybackDraft } from '../../lib/buybackDraft';

const SIDES = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
];

export function ImageAssessmentPage() {
  const navigate = useNavigate();
  const { draft, setAssessmentImages } = useBuybackDraft();
  const { state: permissionState, requestAccess } = useCameraPermission();
  const [files, setFiles] = useState<Record<string, File | null>>({});

  useEffect(() => {
    if (!draft.model || !draft.sku) navigate('/buyback/new', { replace: true });
  }, [draft.model, draft.sku, navigate]);

  const filledCount = Object.values(files).filter(Boolean).length;

  const handleFileChange = (sideId: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [sideId]: file }));
  };

  const handleSubmit = () => {
    const selected = SIDES.map((side) => files[side.id]).filter((f): f is File => Boolean(f));
    setAssessmentImages(selected);
    navigate('/buyback/new/valuation');
  };

  return (
    <PageShell
      title="Image-based assessment"
      subtitle="Capture all 6 sides of the device for AI analysis"
      footer={
        <Button onClick={handleSubmit} disabled={filledCount === 0}>
          Run AI assessment ({filledCount}/6)
        </Button>
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
