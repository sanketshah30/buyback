import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { TextField } from '../../components/ui/TextField';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';

interface LocationState {
  devOtp?: string;
  mobile?: string;
  email?: string;
}

export function CustomerOtpPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | undefined) ?? {};

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      await buybackApi.verifyCustomerOtp(id, otp);
      navigate(`/buyback/${id}/document`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to verify OTP');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Confirm OTP"
      subtitle={`Sent to ${state.mobile ?? 'your mobile'} and ${state.email ?? 'your email'}`}
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSubmit} loading={submitting} disabled={otp.length < 4}>
            Verify &amp; Continue
          </Button>
        </>
      }
    >
      <ProgressSteps current={9} total={12} />

      <TextField
        label="One-time password"
        type="tel"
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
        placeholder="123456"
      />
      {state.devOtp && <Banner tone="info">MVP mock mode - your OTP is {state.devOtp}.</Banner>}
    </PageShell>
  );
}
