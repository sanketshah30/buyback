import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/ui/PageShell';
import { TextField } from '../components/ui/TextField';
import { ApiError } from '../lib/api';
import { authApi } from '../lib/authApi';
import { useAuth } from '../lib/auth';

interface LocationState {
  mobile: string;
  requestId: string;
  devOtp?: string;
}

export function OtpVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const state = location.state as LocationState | undefined;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.requestId) navigate('/login', { replace: true });
  }, [state, navigate]);

  if (!state?.requestId) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.verifyOtp(state.requestId, otp);
      login(response.token, response.user, {
        partnerId: response.partnerId,
        partnerLocationId: response.partnerLocationId,
        roles: response.roles,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Verify OTP" subtitle={`Enter the 6-digit code sent to ${state.mobile}`}>
      <form className="login-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <TextField
          label="One-time password"
          type="tel"
          inputMode="numeric"
          placeholder="123456"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          required
        />
        {state.devOtp && (
          <Banner tone="info">MVP mock mode - your OTP is {state.devOtp} (no real SMS gateway configured).</Banner>
        )}
        {error && <Banner tone="error">{error}</Banner>}
        <Button type="submit" loading={loading} disabled={otp.length < 4}>
          Verify &amp; Continue
        </Button>
      </form>
    </PageShell>
  );
}
