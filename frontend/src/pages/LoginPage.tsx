import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/ui/PageShell';
import { TextField } from '../components/ui/TextField';
import { authApi } from '../lib/authApi';
import { ApiError } from '../lib/api';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.requestOtp(mobile);
      navigate('/otp', { state: { mobile, requestId: response.requestId, devOtp: response.devOtp } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell showBack={false}>
      <div className="login-hero">
        <div className="login-hero__badge">B</div>
        <h1>Sell your device for the best value</h1>
        <p>Log in with your mobile number to start an instant buyback assessment.</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit mobile number"
          maxLength={10}
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
          required
        />
        {error && <Banner tone="error">{error}</Banner>}
        <Button type="submit" loading={loading} disabled={mobile.length !== 10}>
          Send OTP
        </Button>
      </form>
    </PageShell>
  );
}
