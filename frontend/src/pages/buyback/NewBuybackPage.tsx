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

const DEVICE_SAVE_DEBOUNCE_MS = 450;

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
  const [deviceSaved, setDeviceSaved] = useState(false);

  // Section 3: product details
  const [models, setModels] = useState<Model[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [modelId, setModelId] = useState('');
  const [skuId, setSkuId] = useState('');

  const [submittingSection, setSubmittingSection] = useState<SectionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCategorySaved = Boolean(buybackId);
  const isEditingCategory = activeSection === 'category' && isCategorySaved;
  const isEditingDevice = activeSection === 'device' && deviceSaved;

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
      setDeviceSaved(true);
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

  const submitCategory = async () => {
    if (!categoryId || !brandId) return;
    setSubmittingSection('category');
    setError(null);
    try {
      const request = buybackId
        ? await buybackApi.updateCategory(buybackId, categoryId, brandId)
        : await buybackApi.create(categoryId, brandId);
      if (!buybackId) setBuybackId(request.id);
      setCategoryType(request.category?.type);
      setActiveSection('device');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save category & brand');
    } finally {
      setSubmittingSection(null);
    }
  };

  // Section 1 auto-advances the moment both category and brand are first picked - no
  // extra click needed. When re-editing an already-saved section, an explicit "Save
  // changes" button is shown instead (see below), so this only fires for a fresh pick.
  useEffect(() => {
    if (activeSection !== 'category' || buybackId) return;
    if (!categoryId || !brandId) return;
    submitCategory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, brandId, activeSection, buybackId]);

  const submitDevice = async () => {
    if (!buybackId || !deviceValid) return;
    setSubmittingSection('device');
    setError(null);
    try {
      await buybackApi.setDevice(buybackId, deviceValue);
      setDeviceSaved(true);
      setActiveSection('product');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save device details');
    } finally {
      setSubmittingSection(null);
    }
  };

  const isSmartphone = categoryType === 'smartphone';
  const deviceValid = isSmartphone ? /^\d{16}$/.test(deviceValue) : /^[a-zA-Z0-9]{12,16}$/.test(deviceValue);

  // Section 2 auto-advances a moment after a valid IMEI/serial is first entered - no
  // extra click needed. Re-editing an already-saved value uses the explicit button instead.
  useEffect(() => {
    if (activeSection !== 'device' || !buybackId || deviceSaved || !deviceValid) return;
    const timer = setTimeout(() => {
      submitDevice();
    }, DEVICE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceValue, deviceValid, activeSection, buybackId, deviceSaved]);

  if (resumeId && (loadingExisting || !hydrated)) {
    return (
      <PageShell title="Start a new buyback">
        <Spinner />
      </PageShell>
    );
  }

  const categoryStatus = isCategorySaved && activeSection !== 'category' ? 'done' : activeSection === 'category' ? 'active' : 'pending';
  const deviceStatus = deviceSaved && activeSection !== 'device' ? 'done' : activeSection === 'device' ? 'active' : 'pending';
  const productStatus = activeSection === 'product' ? 'active' : 'pending';

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedModel = models.find((m) => m.id === modelId);
  const selectedSku = skus.find((s) => s.id === skuId);

  const handleScanSimulate = () => {
    setDeviceValue(isSmartphone ? randomDigits(16) : randomSerial(14));
  };

  // Reopening an earlier, already-saved section for editing clears whatever was
  // captured after it, since that data may no longer be valid (e.g. a different
  // category changes the IMEI/serial format and the available models/SKUs).
  const handleEditCategory = () => {
    if (activeSection === 'category') return;
    setError(null);
    setDeviceValue('');
    setDeviceSaved(false);
    setModelId('');
    setSkuId('');
    setActiveSection('category');
  };

  const handleEditDevice = () => {
    if (activeSection === 'device') return;
    setError(null);
    setModelId('');
    setSkuId('');
    setActiveSection('device');
  };

  const handleContinueProduct = async () => {
    if (!buybackId || !modelId || !skuId) return;
    setSubmittingSection('product');
    setError(null);
    try {
      await buybackApi.setProduct(buybackId, modelId, skuId);
      navigate(`/buyback/${buybackId}/assessment`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save product details');
    } finally {
      setSubmittingSection(null);
    }
  };

  return (
    <PageShell
      title="Start a new buyback"
      subtitle="Complete each step to get your device assessed"
      footer={
        activeSection === 'product' ? (
          <>
            {error && <Banner tone="error">{error}</Banner>}
            <Button onClick={handleContinueProduct} loading={submittingSection === 'product'} disabled={!modelId || !skuId}>
              Continue to assessment
            </Button>
          </>
        ) : undefined
      }
    >
      <ProgressSteps current={1} total={7} />

      <div className="field-group">
        <AccordionSection
          index={1}
          title="Category & brand"
          status={categoryStatus}
          summary={selectedCategory && selectedBrand ? `${selectedCategory.name} · ${selectedBrand.name}` : undefined}
          onEdit={handleEditCategory}
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
          {isEditingCategory ? (
            <Button
              onClick={submitCategory}
              loading={submittingSection === 'category'}
              disabled={!categoryId || !brandId}
            >
              Save changes
            </Button>
          ) : (
            submittingSection === 'category' && <p className="accordion-inline-status">Starting your buyback…</p>
          )}
          {error && activeSection === 'category' && <Banner tone="error">{error}</Banner>}
        </AccordionSection>

        <AccordionSection
          index={2}
          title={isSmartphone ? 'IMEI number' : 'Serial number'}
          status={deviceStatus}
          summary={deviceSaved ? deviceValue : undefined}
          onEdit={handleEditDevice}
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
          {isEditingDevice ? (
            <Button onClick={submitDevice} loading={submittingSection === 'device'} disabled={!deviceValid}>
              Save changes
            </Button>
          ) : (
            submittingSection === 'device' && <p className="accordion-inline-status">Saving…</p>
          )}
          {error && activeSection === 'device' && <Banner tone="error">{error}</Banner>}
        </AccordionSection>

        <AccordionSection
          index={3}
          title="Product information"
          status={productStatus}
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
