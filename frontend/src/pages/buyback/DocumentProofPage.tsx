import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';

export function DocumentProofPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!id || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await buybackApi.uploadDocument(id, file);
      if (updated.status === 'document_uploaded') {
        navigate(`/buyback/${id}/product-images`);
      } else {
        navigate(`/buyback/${id}/review`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Document proof"
      subtitle="Upload a government ID or purchase invoice for verification"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={!file}>
            Continue
          </Button>
        </>
      }
    >
      <ProgressSteps current={10} total={12} />

      <label className="upload-slot" style={{ aspectRatio: 'auto', height: 200 }}>
        {file ? <img src={URL.createObjectURL(file)} alt="Document proof" /> : <span style={{ fontSize: '2rem' }}>🪪</span>}
        <span className="upload-slot__label">{file ? file.name : 'Tap to capture/upload document'}</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
    </PageShell>
  );
}
