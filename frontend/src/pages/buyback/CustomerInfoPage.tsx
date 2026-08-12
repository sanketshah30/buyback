import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { TextField } from '../../components/ui/TextField';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';

export function CustomerInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isValid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && /^\d{10}$/.test(mobile);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await buybackApi.submitCustomer(id, name, email, mobile);
      navigate(`/buyback/${id}/customer-otp`, { state: { devOtp: response.devOtp, mobile, email } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save your details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Your details"
      subtitle="We'll send an OTP to confirm the buyback"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>
            Send OTP
          </Button>
        </>
      }
    >
      <ProgressSteps current={8} total={12} />

      <div className="field-group">
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
        />
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
          placeholder="10-digit mobile number"
        />
      </div>
    </PageShell>
  );
}
