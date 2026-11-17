import { useCallback, useMemo, useState } from 'react';
import { ResourcePage } from '../../components/admin/ResourcePage';
import { ResourceDrawer } from '../../components/admin/ResourceDrawer';
import { partnersApi, skuPricingApi, skusApi, type SkuPricingBulkRow } from '../../lib/adminApi';
import { getAdminErrorMessage } from '../../lib/adminErrors';
import { formatDate, toDateInput } from '../../lib/adminFormat';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { TextField } from '../../components/ui/TextField';
import type { FieldDef, FormValues } from '../../components/admin/FormFields';
import type { SkuPricing } from '../../types/api';
import './SkuPricingPage.css';

const s = (v: FormValues, key: string) => String(v[key] ?? '').trim();

const CSV_TEMPLATE = 'sku_code,price,valid_from,valid_to\nEXAMPLE-SKU,15000,2026-01-01,\n';

function parseCsv(text: string): { rows: SkuPricingBulkRow[]; parseErrors: string[] } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], parseErrors: ['CSV is empty'] };

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = {
    sku: header.findIndex((h) => h === 'sku_code' || h === 'skucode' || h === 'code' || h === 'sku'),
    price: header.findIndex((h) => h === 'price'),
    from: header.findIndex((h) => h === 'valid_from' || h === 'validfrom' || h === 'from'),
    to: header.findIndex((h) => h === 'valid_to' || h === 'validto' || h === 'to'),
  };
  if (idx.sku < 0 || idx.price < 0 || idx.from < 0) {
    return {
      rows: [],
      parseErrors: ['CSV header must include sku_code, price, valid_from (valid_to optional)'],
    };
  }

  const rows: SkuPricingBulkRow[] = [];
  const parseErrors: string[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const skuCode = cols[idx.sku] ?? '';
    const price = Number(cols[idx.price]);
    const validFrom = cols[idx.from] ?? '';
    const validToRaw = idx.to >= 0 ? cols[idx.to] ?? '' : '';
    if (!skuCode && !cols[idx.price] && !validFrom) continue;
    if (!skuCode || !validFrom || Number.isNaN(price)) {
      parseErrors.push(`Line ${i + 1}: sku_code, price, and valid_from are required`);
      continue;
    }
    rows.push({
      skuCode,
      price,
      validFrom,
      validTo: validToRaw ? validToRaw : null,
    });
  }
  return { rows, parseErrors };
}

export function SkuPricingPage() {
  const vendors = useAdminLookup(() => partnersApi.search({ partnerType: 'vendor' }), 'vendors');
  const skus = useAdminLookup(() => skusApi.search(), 'SKUs');
  const skuName = nameResolver(skus.items, (k) => `${k.code} - ${k.label}`);

  const [vendorFilter, setVendorFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [listVersion, setListVersion] = useState(0);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkVendorId, setBulkVendorId] = useState('');
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<SkuPricingBulkRow[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(() => {
    return skuPricingApi.search({
      ...(vendorFilter ? { vendorId: Number(vendorFilter) } : {}),
      ...(fromFilter ? { validFrom: fromFilter } : {}),
      ...(toFilter ? { validTo: toFilter } : {}),
    });
  }, [vendorFilter, fromFilter, toFilter]);

  const fields = (editing: SkuPricing | null): FieldDef[] => [
    {
      key: 'vendorId',
      label: 'Vendor',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(vendors.items, (v) => v.name, editing?.vendorId),
    },
    {
      key: 'skuId',
      label: 'SKU',
      kind: 'select',
      required: true,
      readOnlyOnEdit: true,
      options: toOptions(skus.items, (k) => `${k.code} - ${k.label}`, editing?.skuId),
    },
    { key: 'price', label: 'Price', kind: 'number', required: true, step: 'any' },
    { key: 'validFrom', label: 'Valid From', kind: 'date', required: true },
    { key: 'validTo', label: 'Valid To', kind: 'date', hint: 'Leave blank to store Null (open-ended).' },
  ];

  const validate = (v: FormValues) => {
    const errors: Record<string, string> = {};
    const price = Number(s(v, 'price'));
    if (s(v, 'price') && (Number.isNaN(price) || price < 0)) errors.price = 'Price must be a non-negative number';
    if (s(v, 'validFrom') && s(v, 'validTo') && s(v, 'validTo') <= s(v, 'validFrom')) {
      errors.validTo = 'Valid To must be after Valid From';
    }
    return errors;
  };

  const vendorOptions = useMemo(
    () => [{ value: '', label: 'All vendors' }, ...vendors.items.map((v) => ({ value: String(v.id), label: v.name }))],
    [vendors.items],
  );

  const handleFile = async (file: File | null) => {
    setBulkError(null);
    setBulkNotice(null);
    setBulkRows([]);
    setBulkFileName(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setBulkError('Please drop a .csv file.');
      return;
    }
    const text = await file.text();
    const { rows, parseErrors } = parseCsv(text);
    if (parseErrors.length) {
      setBulkError(parseErrors.join(' '));
      return;
    }
    if (rows.length === 0) {
      setBulkError('No data rows found in the CSV.');
      return;
    }
    setBulkFileName(file.name);
    setBulkRows(rows);
  };

  const handleBulkSubmit = async () => {
    if (!bulkVendorId) {
      setBulkError('Select a vendor.');
      return;
    }
    if (bulkRows.length === 0) {
      setBulkError('Drop a CSV file first.');
      return;
    }
    setBulkSubmitting(true);
    setBulkError(null);
    setBulkNotice(null);
    try {
      const result = await skuPricingApi.bulk(Number(bulkVendorId), bulkRows);
      const summary = `Uploaded ${result.created} price${result.created === 1 ? '' : 's'}.${
        result.failed ? ` ${result.failed} row(s) failed.` : ''
      }`;
      if (result.failed && result.errors.length) {
        setBulkError(
          `${summary} ${result.errors
            .slice(0, 5)
            .map((e) => `Line ${e.line}: ${e.error}`)
            .join(' ')}`,
        );
      } else {
        setBulkNotice(summary);
      }
      if (result.created > 0) {
        setListVersion((k) => k + 1);
        setBulkRows([]);
        setBulkFileName(null);
      }
    } catch (err) {
      setBulkError(getAdminErrorMessage(err));
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <>
      <ResourcePage<SkuPricing>
        title="SKU Pricing"
        entityName="price"
        reloadKey={`${listVersion}|${vendorFilter}|${fromFilter}|${toFilter}`}
        columns={[
          { key: 'id', header: 'ID', render: (r) => r.id },
          { key: 'sku', header: 'SKU', render: (r) => skuName(r.skuId) },
          { key: 'price', header: 'Price', align: 'right', render: (r) => `₹${r.price}` },
          { key: 'from', header: 'Valid From', render: (r) => formatDate(r.validFrom) },
          { key: 'to', header: 'Valid To', render: (r) => (r.validTo ? formatDate(r.validTo) : 'Null') },
        ]}
        load={load}
        fields={fields}
        emptyValues={{ vendorId: vendorFilter || '', skuId: '', price: '', validFrom: '', validTo: '' }}
        toFormValues={(r) => ({
          vendorId: String(r.vendorId),
          skuId: String(r.skuId),
          price: String(r.price),
          validFrom: toDateInput(r.validFrom),
          validTo: toDateInput(r.validTo),
        })}
        validate={validate}
        onCreate={(v) =>
          skuPricingApi.create({
            vendorId: Number(v.vendorId),
            skuId: Number(v.skuId),
            price: Number(s(v, 'price')),
            validFrom: s(v, 'validFrom'),
            validTo: s(v, 'validTo') || undefined,
          })
        }
        onUpdate={(row, v) =>
          skuPricingApi.update(row.id, {
            price: Number(s(v, 'price')),
            validFrom: s(v, 'validFrom'),
            validTo: s(v, 'validTo') || null,
          })
        }
        onSetActive={(row, isActive) => skuPricingApi.update(row.id, { isActive })}
        extraError={vendors.error ?? skus.error}
        headerActions={
          <Button variant="secondary" fullWidth={false} onClick={() => setBulkOpen(true)}>
            Bulk upload
          </Button>
        }
        toolbarExtra={
          <div className="sku-pricing-filters">
            <Select
              label="Vendor"
              options={vendorOptions}
              value={vendorFilter}
              onChange={setVendorFilter}
              placeholder="All vendors"
            />
            <TextField
              label="From"
              type="date"
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
            />
            <TextField label="To" type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} />
          </div>
        }
      />

      <ResourceDrawer
        open={bulkOpen}
        title="Bulk Upload SKU Prices"
        submitLabel="Upload"
        submitting={bulkSubmitting}
        error={bulkError}
        onClose={() => {
          setBulkOpen(false);
          setBulkError(null);
          setBulkNotice(null);
        }}
        onSubmit={() => void handleBulkSubmit()}
      >
        {bulkNotice && <Banner tone="success">{bulkNotice}</Banner>}
        <Select
          label="Vendor"
          options={vendors.items.map((v) => ({ value: String(v.id), label: v.name }))}
          value={bulkVendorId}
          onChange={setBulkVendorId}
          placeholder="Select vendor"
          error={!bulkVendorId && bulkError ? 'Required' : undefined}
        />
        <div
          className={`sku-pricing-dropzone ${dragOver ? 'sku-pricing-dropzone--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <p>Drop a CSV file here, or choose one</p>
          <p className="sku-pricing-dropzone__hint">Columns: sku_code, price, valid_from, valid_to (blank = Null)</p>
          {bulkFileName && (
            <p className="sku-pricing-dropzone__file">
              {bulkFileName} · {bulkRows.length} row{bulkRows.length === 1 ? '' : 's'}
            </p>
          )}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button
          type="button"
          className="sku-pricing-template"
          onClick={() => {
            const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sku-pricing-template.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download CSV template
        </button>
      </ResourceDrawer>
    </>
  );
}
