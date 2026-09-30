import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/ui/PageShell';
import { TextField } from '../components/ui/TextField';
import { authApi } from '../lib/authApi';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import './LoginPage.css';

type Step = 'mobile' | 'otp';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, sessionExpired } = useAuth();
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.requestOtp(mobile);
      setRequestId(response.requestId);
      setDevOtp(response.devOtp);
      setOtp('');
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!requestId) return;
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.verifyOtp(requestId, otp);
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

  const handleChangeNumber = () => {
    setStep('mobile');
    setRequestId(null);
    setDevOtp(undefined);
    setOtp('');
    setError(null);
  };

  return (
    <PageShell showBack={false}>
      <div className="login-hero">
        <div className="login-hero__badge">B</div>
        <h1>Sell your device for the best value</h1>
        <p>
          {step === 'mobile'
            ? 'Log in with your mobile number to start an instant buyback assessment.'
            : `Enter the 6-digit code sent to ${mobile}.`}
        </p>
      </div>

      {step === 'mobile' ? (
        <form className="login-form" onSubmit={handleRequestOtp}>
          {sessionExpired && <Banner tone="info">Your session has ended. Please log in again.</Banner>}
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
      ) : (
        <form className="login-form" onSubmit={handleVerifyOtp}>
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
          {devOtp && (
            <Banner tone="info">MVP mock mode - your OTP is {devOtp} (no real SMS gateway configured).</Banner>
          )}
          {error && <Banner tone="error">{error}</Banner>}
          <Button type="submit" loading={loading} disabled={otp.length < 4}>
            Verify &amp; Continue
          </Button>
          <button type="button" className="login-form__link" onClick={handleChangeNumber}>
            Change mobile number
          </button>
        </form>
      )}
    </PageShell>
  );
}
