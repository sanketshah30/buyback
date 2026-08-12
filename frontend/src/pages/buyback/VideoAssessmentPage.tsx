import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';

export function VideoAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: permissionState, requestAccess } = useCameraPermission();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!id || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      await buybackApi.submitVideo(id, file);
      navigate(`/buyback/${id}/valuation`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload video');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Video-based assessment"
      subtitle="Record a short walkaround video of your device"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={!file}>
            Run AI assessment
          </Button>
        </>
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
