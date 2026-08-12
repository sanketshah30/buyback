import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccordionSection } from '../../components/ui/AccordionSection';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Select } from '../../components/ui/Select';
import { TextField } from '../../components/ui/TextField';
import { ScanIcon } from '../../components/ui/icons';
import { useBuybackDraft } from '../../lib/buybackDraft';
import { catalogApi } from '../../lib/catalogApi';
import type { Brand, Category, Model, Sku } from '../../types/api';

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
  const navigate = useNavigate();
  const { draft, setCategoryBrand, setIdentifier, setProduct } = useBuybackDraft();

  const [activeSection, setActiveSection] = useState<SectionKey>(draft.category && draft.brand ? (draft.identifier ? 'product' : 'device') : 'category');

  // Section 1: category + brand
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryId, setCategoryId] = useState(draft.category?.id ?? '');
  const [brandId, setBrandId] = useState(draft.brand?.id ?? '');

  // Section 2: device identifier
  const [deviceValue, setDeviceValue] = useState(draft.identifier?.value ?? '');

  // Section 3: product details
  const [models, setModels] = useState<Model[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [modelId, setModelId] = useState(draft.model?.id ?? '');
  const [skuId, setSkuId] = useState(draft.sku?.id ?? '');

  useEffect(() => {
    catalogApi.listCategories().then(setCategories);
  }, []);

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

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? draft.category;
  const selectedBrand = brands.find((b) => b.id === brandId) ?? draft.brand;
  const selectedModel = models.find((m) => m.id === modelId);
  const selectedSku = skus.find((s) => s.id === skuId);
  const isSmartphone = selectedCategory?.type === 'smartphone';
  const deviceValid = isSmartphone ? /^\d{16}$/.test(deviceValue) : /^[a-zA-Z0-9]{12,16}$/.test(deviceValue);

  // Everything here is purely local state - nothing is sent to the server until the
  // valuation step, so sections advance instantly with no network round-trip.
  useEffect(() => {
    if (activeSection !== 'category' || !categoryId || !brandId) return;
    const category = categories.find((c) => c.id === categoryId);
    const brand = brands.find((b) => b.id === brandId);
    if (!category || !brand) return;
    setCategoryBrand(category, brand);
    setActiveSection('device');
  }, [categoryId, brandId, categories, brands, activeSection, setCategoryBrand]);

  useEffect(() => {
    if (activeSection !== 'device' || !deviceValid) return;
    setIdentifier({ type: isSmartphone ? 'imei' : 'serial', value: deviceValue });
    setActiveSection('product');
  }, [deviceValue, deviceValid, isSmartphone, activeSection, setIdentifier]);

  const categoryStatus = activeSection === 'category' ? 'active' : draft.category ? 'done' : 'pending';
  const deviceStatus = activeSection === 'device' ? 'active' : draft.identifier ? 'done' : 'pending';
  const productStatus = activeSection === 'product' ? 'active' : 'pending';

  const handleScanSimulate = () => {
    setDeviceValue(isSmartphone ? randomDigits(16) : randomSerial(14));
  };

  // Reopening an earlier section clears its input (and whatever came after it) so the
  // user starts that step fresh rather than silently auto-advancing again with stale
  // values the moment they click "edit".
  const handleEditCategory = () => {
    if (activeSection === 'category') return;
    setCategoryId('');
    setBrandId('');
    setDeviceValue('');
    setModelId('');
    setSkuId('');
    setActiveSection('category');
  };

  const handleEditDevice = () => {
    if (activeSection === 'device') return;
    setDeviceValue('');
    setModelId('');
    setSkuId('');
    setActiveSection('device');
  };

  const handleContinueProduct = () => {
    if (!selectedModel || !selectedSku) return;
    setProduct(selectedModel, selectedSku);
    navigate('/buyback/new/assessment');
  };

  return (
    <PageShell
      title="Start a new buyback"
      subtitle="Complete each step to get your device assessed"
      footer={
        activeSection === 'product' ? (
          <Button onClick={handleContinueProduct} disabled={!modelId || !skuId}>
            Continue to assessment
          </Button>
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
        </AccordionSection>

        <AccordionSection
          index={2}
          title={isSmartphone ? 'IMEI number' : 'Serial number'}
          status={deviceStatus}
          summary={draft.identifier?.value}
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
