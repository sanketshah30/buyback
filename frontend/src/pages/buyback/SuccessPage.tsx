import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { useBuyback } from '../../hooks/useBuyback';

export function SuccessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useBuyback(id);

  return (
    <PageShell showBack={false}>
      <div className="value-hero" style={{ paddingTop: 60 }}>
        <span style={{ fontSize: '3rem' }}>🎉</span>
        <h1 style={{ marginTop: 12 }}>Buyback confirmed!</h1>
        <p style={{ marginTop: 8 }}>
          Your request <strong style={{ color: 'var(--color-gold)' }}>{data?.displayId}</strong> has been received.
          Our team will reach out with pickup/drop-off details.
        </p>
        {data?.finalValue !== undefined && (
          <div style={{ marginTop: 20 }}>
            <span className="value-hero__label">Final value</span>
            <div className="value-hero__amount">₹{data.finalValue}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <Button onClick={() => navigate('/')}>Back to home</Button>
      </div>
    </PageShell>
  );
}
