import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';
import { catalogApi } from '../../lib/catalogApi';
import type { Brand, Category } from '../../types/api';

export function CategoryBrandPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
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
    if (!category) {
      setBrands([]);
      setBrand(null);
      return;
    }
    catalogApi.listBrands(category.id).then(setBrands);
    setBrand(null);
  }, [category]);

  const handleContinue = async () => {
    if (!category || !brand) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await buybackApi.create(category.id, brand.id);
      navigate(`/buyback/${request.id}/device`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start buyback request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell title="Start a new buyback" subtitle="Select your device category and brand">
      <ProgressSteps current={1} total={12} />
      {loading && <Spinner label="Loading categories…" />}
      {error && <Banner tone="error">{error}</Banner>}

      {!loading && (
        <>
          <section>
            <h3 className="section-label">Category</h3>
            <div className="chip-grid">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  interactive
                  selected={category?.id === cat.id}
                  onClick={() => setCategory(cat)}
                  className="chip-card"
                >
                  {cat.name}
                </Card>
              ))}
            </div>
          </section>

          {category && (
            <section>
              <h3 className="section-label">Brand</h3>
              <div className="chip-grid">
                {brands.map((b) => (
                  <Card
                    key={b.id}
                    interactive
                    selected={brand?.id === b.id}
                    onClick={() => setBrand(b)}
                    className="chip-card"
                  >
                    {b.name}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <Button onClick={handleContinue} loading={submitting} disabled={!category || !brand}>
          Continue
        </Button>
      </div>
    </PageShell>
  );
}
