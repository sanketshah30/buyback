import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { useBuybackDraft } from '../../lib/buybackDraft';

export function VideoAssessmentPage() {
  const navigate = useNavigate();
  const { draft, setAssessmentVideo } = useBuybackDraft();
  const { state: permissionState, requestAccess } = useCameraPermission();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!draft.model || !draft.sku) navigate('/buyback/new', { replace: true });
  }, [draft.model, draft.sku, navigate]);

  const handleSubmit = () => {
    if (!file) return;
    setAssessmentVideo(file);
    navigate('/buyback/new/valuation');
  };

  return (
    <PageShell
      title="Video-based assessment"
      subtitle="Record a short walkaround video of your device"
      footer={
        <Button onClick={handleSubmit} disabled={!file}>
          Run AI assessment
        </Button>
      }
    >
      <ProgressSteps current={3} total={7} />

      {permissionState !== 'granted' && (
        <Banner tone="warning">
          We need camera access to record a video.{' '}
          <button
            type="button"
            onClick={requestAccess}
            style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
          >
            Enable camera
          </button>
        </Banner>
      )}

      <label className="upload-slot" style={{ aspectRatio: 'auto', height: 220 }}>
        {file ? (
          <video src={URL.createObjectURL(file)} controls style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '2rem' }}>🎥</span>
        )}
        <span className="upload-slot__label">{file ? file.name : 'Tap to record/upload a video'}</span>
        <input type="file" accept="video/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
    </PageShell>
  );
}
