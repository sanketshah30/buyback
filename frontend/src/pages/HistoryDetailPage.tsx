import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/ui/PageShell';
import { Spinner } from '../components/ui/Spinner';
import { useBuyback } from '../hooks/useBuyback';
import './HistoryDetailPage.css';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="history-detail__row">
      <span className="history-detail__label">{label}</span>
      <span className="history-detail__value">{value?.trim() ? value : '—'}</span>
    </div>
  );
}

export function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useBuyback(id);

  if (loading) {
    return (
      <PageShell title="Buyback details">
        <Spinner />
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell title="Buyback details">
        <Banner tone="error">{error ?? 'Buyback request not found.'}</Banner>
      </PageShell>
    );
  }

  const deviceLine = [data.brand?.name, data.product?.name].filter(Boolean).join(' · ') || '—';
  const idLabel = data.identifier?.type === 'serial' ? 'Serial' : 'IMEI';

  return (
    <PageShell
      title="Buyback details"
      footer={
        data.receiptUrl ? (
          <Button onClick={() => navigate(`/buyback/${data.id}/receipt`)}>View purchase receipt</Button>
        ) : undefined
      }
    >
      <header className="history-detail__hero">
        <div className="history-detail__hero-top">
          <span className="history-detail__ref">{data.referenceId ?? `#${data.id}`}</span>
          <span className="history-detail__badge">Completed</span>
        </div>
        <p className="history-detail__amount">
          {data.finalValue !== undefined ? `₹${data.finalValue}` : '—'}
        </p>
        <p className="history-detail__meta">{formatDate(data.completedAt ?? data.updatedAt)}</p>
      </header>

      <section className="history-detail__card">
        <h3 className="history-detail__card-title">Device</h3>
        <DetailRow label="Product" value={deviceLine} />
        <DetailRow label="Category" value={data.category?.name} />
        <DetailRow label="SKU" value={data.sku?.label} />
        <DetailRow label={idLabel} value={data.identifier?.value} />
      </section>

      <section className="history-detail__card">
        <h3 className="history-detail__card-title">Customer</h3>
        <DetailRow label="Name" value={data.customer?.name} />
        <DetailRow label="Mobile" value={data.customer?.mobile} />
        <DetailRow label="Email" value={data.customer?.email} />
      </section>

      {!data.receiptUrl && (
        <Banner tone="info">No purchase receipt is available for this buyback yet.</Banner>
      )}
    </PageShell>
  );
}
