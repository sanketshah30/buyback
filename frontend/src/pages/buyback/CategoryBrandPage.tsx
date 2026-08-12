import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';
import { catalogApi } from '../../lib/catalogApi';
import type { Brand, Category } from '../../types/api';

export function CategoryBrandPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    catalogApi
      .listCategories()
      .then(setCategories)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load categories'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBrandId('');
    if (!categoryId) {
      setBrands([]);
      return;
    }
    catalogApi.listBrands(categoryId).then(setBrands);
  }, [categoryId]);

  const handleContinue = async () => {
    if (!categoryId || !brandId) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await buybackApi.create(categoryId, brandId);
      navigate(`/buyback/${request.id}/device`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start buyback request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Start a new buyback"
      subtitle="Select your device category and brand"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleContinue} loading={submitting} disabled={!categoryId || !brandId}>
            Continue
          </Button>
        </>
      }
    >
      <ProgressSteps current={1} total={10} />
      {loading && <Spinner label="Loading categories…" />}

      {!loading && (
        <div className="field-group">
          <Select
            label="Category"
            placeholder="Select a category"
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
          />
          <Select
            label="Brand"
            placeholder={categoryId ? 'Select a brand' : 'Select a category first'}
            value={brandId}
            onChange={setBrandId}
            disabled={!categoryId}
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>
      )}
    </PageShell>
  );
}
