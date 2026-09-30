import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/ui/PageShell';
import { Spinner } from '../components/ui/Spinner';
import { useBuyback } from '../hooks/useBuyback';

function formatDate(iso?: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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

  return (
    <PageShell
      title="Buyback details"
      subtitle={data.referenceId ? `Request ${data.referenceId}` : undefined}
      footer={
        data.receiptUrl ? (
          <Button onClick={() => navigate(`/buyback/${data.id}/receipt`)}>View purchase receipt</Button>
        ) : undefined
      }
    >
      <section>
        <h3 className="section-label">Request</h3>
        <div className="summary-list">
          <div className="summary-row">
            <span className="summary-row__label">Reference</span>
            <span className="summary-row__value">{data.referenceId ?? `#${data.id}`}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Status</span>
            <span className="summary-row__value">Completed</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Completed</span>
            <span className="summary-row__value">{formatDate(data.completedAt ?? data.updatedAt)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Final value</span>
            <span className="summary-row__value">
              {data.finalValue !== undefined ? `₹${data.finalValue}` : '-'}
            </span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="section-label">Device</h3>
        <div className="summary-list">
          <div className="summary-row">
            <span className="summary-row__label">Category</span>
            <span className="summary-row__value">{data.category?.name ?? '-'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Brand / Product</span>
            <span className="summary-row__value">
              {[data.brand?.name, data.product?.name].filter(Boolean).join(' · ') || '-'}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">SKU</span>
            <span className="summary-row__value">{data.sku?.label ?? '-'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">{data.identifier?.type === 'serial' ? 'Serial number' : 'IMEI'}</span>
            <span className="summary-row__value">{data.identifier?.value ?? '-'}</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="section-label">Customer</h3>
        <div className="summary-list">
          <div className="summary-row">
            <span className="summary-row__label">Name</span>
            <span className="summary-row__value">{data.customer?.name ?? '-'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Mobile</span>
            <span className="summary-row__value">{data.customer?.mobile ?? '-'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Email</span>
            <span className="summary-row__value">{data.customer?.email ?? '-'}</span>
          </div>
        </div>
      </section>

      {!data.receiptUrl && (
        <Banner tone="info">No purchase receipt is available for this buyback yet.</Banner>
      )}
    </PageShell>
  );
}
