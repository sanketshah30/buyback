import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AccordionSection } from '../../components/ui/AccordionSection';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { TextField } from '../../components/ui/TextField';
import { ScanIcon } from '../../components/ui/icons';
import { useBuyback } from '../../hooks/useBuyback';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';
import { catalogApi } from '../../lib/catalogApi';
import type { Brand, Category, DeviceCategoryType, Model, Sku } from '../../types/api';

type SectionKey = 'category' | 'device' | 'product';

function randomDigits(length: number) {
  let result = '';
  for (let i = 0; i < length; i += 1) result += Math.floor(Math.random() * 10);
  return result;
}

function randomSerial(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export function NewBuybackPage() {
  const { id: resumeId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { data: existing, loading: loadingExisting } = useBuyback(resumeId);

  const [buybackId, setBuybackId] = useState<string | undefined>(resumeId);
  const [activeSection, setActiveSection] = useState<SectionKey>('category');
  const [hydrated, setHydrated] = useState(!resumeId);

  // Section 1: category + brand
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryType, setCategoryType] = useState<DeviceCategoryType | undefined>(undefined);

  // Section 2: device identifier
  const [deviceValue, setDeviceValue] = useState('');

  // Section 3: product details
  const [models, setModels] = useState<Model[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [modelId, setModelId] = useState('');
  const [skuId, setSkuId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    catalogApi.listCategories().then(setCategories);
  }, []);

  // Resume an in-progress buyback (started, but category+brand and maybe device already captured).
  useEffect(() => {
    if (!resumeId || !existing) return;
    setBuybackId(existing.id);
    if (existing.category) {
      setCategoryId(existing.category.id);
      setCategoryType(existing.category.type);
    }
    if (existing.brand) setBrandId(existing.brand.id);
    if (existing.identifier) {
      setDeviceValue(existing.identifier.value);
      setActiveSection('product');
    } else {
      setActiveSection('device');
    }
    setHydrated(true);
  }, [resumeId, existing]);

  useEffect(() => {
    if (!categoryId) {
      setBrands([]);
      return;
    }
    catalogApi.listBrands(categoryId).then(setBrands);
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId || !brandId) {
      setModels([]);
      return;
    }
    catalogApi.listModels(categoryId, brandId).then(setModels);
  }, [categoryId, brandId]);

  useEffect(() => {
    if (!modelId) {
      setSkus([]);
      return;
    }
    catalogApi.listSkus(modelId).then(setSkus);
  }, [modelId]);

  if (resumeId && (loadingExisting || !hydrated)) {
    return (
      <PageShell title="Start a new buyback">
        <Spinner />
      </PageShell>
    );
  }

  const categoryDone = Boolean(buybackId);
  const isSmartphone = categoryType === 'smartphone';
  const deviceValid = isSmartphone ? /^\d{16}$/.test(deviceValue) : /^[a-zA-Z0-9]{12,16}$/.test(deviceValue);
  const deviceDone = categoryDone && deviceValid && activeSection === 'product';

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedModel = models.find((m) => m.id === modelId);
  const selectedSku = skus.find((s) => s.id === skuId);

  const handleScanSimulate = () => {
    setDeviceValue(isSmartphone ? randomDigits(16) : randomSerial(14));
  };

  const handleContinueCategory = async () => {
    if (!categoryId || !brandId) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = await buybackApi.create(categoryId, brandId);
      setBuybackId(request.id);
      setCategoryType(request.category?.type);
      setActiveSection('device');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start buyback request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueDevice = async () => {
    if (!buybackId) return;
    setSubmitting(true);
    setError(null);
    try {
      await buybackApi.setDevice(buybackId, deviceValue);
      setActiveSection('product');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save device details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueProduct = async () => {
    if (!buybackId || !modelId || !skuId) return;
    setSubmitting(true);
    setError(null);
    try {
      await buybackApi.setProduct(buybackId, modelId, skuId);
      navigate(`/buyback/${buybackId}/assessment`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save product details');
    } finally {
      setSubmitting(false);
    }
  };

  const footerAction = {
    category: { label: 'Continue', disabled: !categoryId || !brandId, onClick: handleContinueCategory },
    device: { label: 'Continue', disabled: !deviceValid, onClick: handleContinueDevice },
    product: { label: 'Continue to assessment', disabled: !modelId || !skuId, onClick: handleContinueProduct },
  }[activeSection];

  const currentStep = activeSection === 'category' ? 1 : activeSection === 'device' ? 2 : 3;

  return (
    <PageShell
      title="Start a new buyback"
      subtitle="Complete each step to get your device assessed"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={footerAction.onClick} loading={submitting} disabled={footerAction.disabled}>
            {footerAction.label}
          </Button>
        </>
      }
    >
      <ProgressSteps current={currentStep} total={10} />

      <div className="field-group">
        <AccordionSection
          index={1}
          title="Category & brand"
          status={categoryDone ? 'done' : activeSection === 'category' ? 'active' : 'pending'}
          summary={selectedCategory && selectedBrand ? `${selectedCategory.name} · ${selectedBrand.name}` : undefined}
        >
          <Select
            label="Category"
            placeholder="Select a category"
            value={categoryId}
            onChange={(value) => {
              setCategoryId(value);
              setBrandId('');
            }}
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
        </AccordionSection>

        <AccordionSection
          index={2}
          title={isSmartphone ? 'IMEI number' : 'Serial number'}
          status={deviceDone ? 'done' : activeSection === 'device' ? 'active' : 'pending'}
          summary={deviceDone ? deviceValue : undefined}
        >
          <TextField
            label={isSmartphone ? 'IMEI (16 digits)' : 'Serial number (12-16 characters)'}
            value={deviceValue}
            onChange={(e) =>
              setDeviceValue(
                isSmartphone ? e.target.value.replace(/\D/g, '').slice(0, 16) : e.target.value.slice(0, 16),
              )
            }
            placeholder={isSmartphone ? 'e.g. 356938035643809' : 'e.g. R58N30ABCD12'}
            inputMode={isSmartphone ? 'numeric' : 'text'}
            rightSlot={
              <button
                type="button"
                className="text-field__icon-btn"
                onClick={handleScanSimulate}
                aria-label={isSmartphone ? 'Scan IMEI barcode' : 'Scan serial barcode'}
                title={isSmartphone ? 'Scan IMEI barcode' : 'Scan serial barcode'}
              >
                <ScanIcon />
              </button>
            }
          />
          <Banner tone="info">
            {isSmartphone
              ? 'Dial *#06# on the device to find the IMEI, or scan the barcode on the box/SIM tray.'
              : 'The serial number is usually printed on the underside of the device or inside the battery compartment.'}
          </Banner>
        </AccordionSection>

        <AccordionSection
          index={3}
          title="Product information"
          status={activeSection === 'product' ? 'active' : 'pending'}
          summary={selectedModel && selectedSku ? `${selectedModel.name} · ${selectedSku.label}` : undefined}
        >
          <label className="text-field">
            <span className="text-field__label">Brand</span>
            <div className="text-field__control">
              <input className="text-field__input" value={selectedBrand?.name ?? ''} disabled />
            </div>
          </label>

          <Select
            label="Model"
            placeholder="Select model"
            value={modelId}
            onChange={(value) => {
              setModelId(value);
              setSkuId('');
            }}
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
        </AccordionSection>
      </div>
    </PageShell>
  );
}
