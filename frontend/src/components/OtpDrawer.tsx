import { useEffect, useState } from 'react';
import { Banner } from './ui/Banner';
import { Button } from './ui/Button';
import './OtpDrawer.css';

interface OtpDrawerProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  devOtp?: string;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  onResend: (channel: 'sms' | 'call') => Promise<void>;
}

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpDrawer({ open, title = 'Enter OTP', subtitle, devOtp, onClose, onVerify, onResend }: OtpDrawerProps) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState<'sms' | 'call' | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (open) {
      setOtp('');
      setError(null);
      setInfo(null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!open) return null;

  const handleVerify = async () => {
    setError(null);
    setVerifying(true);
    try {
      await onVerify(otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async (channel: 'sms' | 'call') => {
    setError(null);
    setInfo(null);
    setResending(channel);
    try {
      await onResend(channel);
      setInfo(channel === 'call' ? "We're calling you now with your OTP." : 'A new OTP has been sent.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResending(null);
    }
  };

  return (
    <div className="otp-drawer__overlay" onClick={onClose}>
      <div className="otp-drawer" onClick={(e) => e.stopPropagation()}>
        <span className="otp-drawer__handle" />
        <button type="button" className="otp-drawer__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 className="otp-drawer__title">{title}</h2>
        {subtitle && <p className="otp-drawer__subtitle">{subtitle}</p>}

        <input
          className="otp-drawer__input"
          type="tel"
          inputMode="numeric"
          maxLength={6}
          autoFocus
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="• • • • • •"
        />

        {devOtp && <Banner tone="info">MVP mock mode - your OTP is {devOtp}.</Banner>}
        {info && <Banner tone="success">{info}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}

        <Button onClick={handleVerify} loading={verifying} disabled={otp.length < 4}>
          Verify &amp; Continue
        </Button>

        <div className="otp-drawer__resend-row">
          <button
            type="button"
            className="otp-drawer__link"
            disabled={cooldown > 0 || resending !== null}
            onClick={() => handleResend('sms')}
          >
            {resending === 'sms' ? 'Sending…' : 'Resend OTP'}
          </button>
          <span className="otp-drawer__divider" />
          <button
            type="button"
            className="otp-drawer__link"
            disabled={cooldown > 0 || resending !== null}
            onClick={() => handleResend('call')}
          >
            {resending === 'call' ? 'Calling…' : 'Send OTP over call'}
          </button>
        </div>
        {cooldown > 0 && <p className="otp-drawer__cooldown">You can request another OTP in {cooldown}s</p>}
      </div>
    </div>
  );
}
