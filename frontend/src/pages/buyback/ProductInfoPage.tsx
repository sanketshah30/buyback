import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { useBuyback } from '../../hooks/useBuyback';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';
import { catalogApi } from '../../lib/catalogApi';
import type { Model, Sku } from '../../types/api';

export function ProductInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useBuyback(id);

  const [models, setModels] = useState<Model[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [modelId, setModelId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!data?.category || !data.brand) return;
    catalogApi.listModels(data.category.id, data.brand.id).then(setModels);
  }, [data?.category, data?.brand]);

  useEffect(() => {
    setSkuId('');
    if (!modelId) {
      setSkus([]);
      return;
    }
    catalogApi.listSkus(modelId).then(setSkus);
  }, [modelId]);

  if (loading) return <PageShell title="Product information"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Product information"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

  const handleSubmit = async () => {
    if (!id || !modelId || !skuId) return;
    setSubmitting(true);
    setError(null);
    try {
      await buybackApi.setProduct(id, modelId, skuId);
      navigate(`/buyback/${id}/assessment`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save product details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Product information"
      subtitle="Review and confirm the exact model of your device"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={!modelId || !skuId}>
            Continue to assessment
          </Button>
        </>
      }
    >
      <ProgressSteps current={3} total={10} />

      <div className="field-group">
        <label className="text-field">
          <span className="text-field__label">Brand</span>
          <div className="text-field__control">
            <input className="text-field__input" value={data.brand?.name ?? ''} disabled />
          </div>
        </label>

        <Select
          label="Model"
          placeholder="Select model"
          value={modelId}
          onChange={setModelId}
          options={models.map((m) => ({ value: m.id, label: m.name }))}
        />

        <Select
          label="SKU / Variant"
          placeholder={modelId ? 'Select SKU' : 'Select a model first'}
          value={skuId}
          onChange={setSkuId}
          disabled={!modelId}
          options={skus.map((s) => ({ value: s.id, label: s.label }))}
        />
      </div>
    </PageShell>
  );
}
