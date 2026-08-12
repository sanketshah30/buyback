import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { TextField } from '../../components/ui/TextField';
import { useBuyback } from '../../hooks/useBuyback';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';

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

export function DeviceIdentifierPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useBuyback(id);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageShell title="Device details"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Device details"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

  const isSmartphone = data.category?.type === 'smartphone';

  const handleScanSimulate = () => {
    setValue(isSmartphone ? randomDigits(16) : randomSerial(14));
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      await buybackApi.setDevice(id, value);
      navigate(`/buyback/${id}/product`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save device details');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = isSmartphone ? /^\d{16}$/.test(value) : /^[a-zA-Z0-9]{12,16}$/.test(value);

  return (
    <PageShell
      title={isSmartphone ? 'Enter IMEI number' : 'Enter serial number'}
      subtitle={`${data.category?.name} · ${data.brand?.name}`}
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>
            Continue
          </Button>
        </>
      }
    >
      <ProgressSteps current={2} total={12} />

      <div className="field-group">
        <TextField
          label={isSmartphone ? 'IMEI (16 digits)' : 'Serial number (12-16 characters)'}
          value={value}
          onChange={(e) =>
            setValue(isSmartphone ? e.target.value.replace(/\D/g, '').slice(0, 16) : e.target.value.slice(0, 16))
          }
          placeholder={isSmartphone ? 'e.g. 356938035643809' : 'e.g. R58N30ABCD12'}
          inputMode={isSmartphone ? 'numeric' : 'text'}
        />
        <Button variant="secondary" type="button" onClick={handleScanSimulate}>
          {isSmartphone ? '📷 Scan IMEI barcode' : '📷 Scan serial barcode'}
        </Button>
        <Banner tone="info">
          {isSmartphone
            ? 'Dial *#06# on the device to find the IMEI, or scan the barcode on the box/SIM tray.'
            : 'The serial number is usually printed on the underside of the device or inside the battery compartment.'}
        </Banner>
      </div>
    </PageShell>
  );
}
