import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { ProgressSteps } from '../../components/ui/ProgressSteps';
import { Spinner } from '../../components/ui/Spinner';
import { TextField } from '../../components/ui/TextField';
import { OtpDrawer } from '../../components/OtpDrawer';
import { useBuyback } from '../../hooks/useBuyback';
import { ApiError } from '../../lib/api';
import { buybackApi } from '../../lib/buybackApi';

export function CustomerInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useBuyback(id);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);

  if (loading) return <PageShell title="Confirm buyback"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Confirm buyback"><Banner tone="error">Buyback request not found.</Banner></PageShell>;

  const isValid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && /^\d{10}$/.test(mobile);

  const handleSendOtp = async () => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await buybackApi.submitCustomer(id, name, email, mobile);
      setDevOtp(response.devOtp);
      setDrawerOpen(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (otp: string) => {
    if (!id) return;
    await buybackApi.verifyCustomerOtp(id, otp);
    navigate(`/buyback/${id}/document`);
  };

  const handleResend = async (channel: 'sms' | 'call') => {
    if (!id) return;
    const response = await buybackApi.resendCustomerOtp(id, channel);
    setDevOtp(response.devOtp);
  };

  return (
    <PageShell
      title="Confirm buyback"
      subtitle="Review your final value and share your details"
      footer={
        <>
          {error && <Banner tone="error">{error}</Banner>}
          <Button onClick={handleSendOtp} loading={submitting} disabled={!isValid}>
            Send OTP
          </Button>
        </>
      }
    >
      <ProgressSteps current={8} total={10} />

      <div className="value-hero" style={{ paddingTop: 12, paddingBottom: 0 }}>
        <span className="value-hero__label">Final value</span>
        <span className="value-hero__amount">₹{data.finalValue}</span>
        <span className="value-hero__id">Buyback ID: {data.displayId}</span>
      </div>

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

      <OtpDrawer
        open={drawerOpen}
        title="Confirm OTP"
        subtitle={`Sent to ${mobile} and ${email}`}
        devOtp={devOtp}
        onClose={() => setDrawerOpen(false)}
        onVerify={handleVerify}
        onResend={handleResend}
      />
    </PageShell>
  );
}
