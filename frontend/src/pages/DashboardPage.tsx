import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components/ui/Banner';
import { Card } from '../components/ui/Card';
import { PageShell } from '../components/ui/PageShell';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../lib/auth';
import { buybackApi } from '../lib/buybackApi';
import { useBuybackDraft } from '../lib/buybackDraft';
import type { BuybackRequest } from '../types/api';
import './DashboardPage.css';

// Category, IMEI/serial, product, and physical assessment are all captured as local,
// unsaved state (see src/lib/buybackDraft.tsx) - no backend record exists for a buyback
// until its value has been calculated, so only those later statuses are ever resumable.
const STATUS_LABELS: Record<string, string> = {
  valuation_ready: 'Valuation ready',
  diagnosis_pending: 'Diagnosis in progress',
  diagnosis_completed: 'Diagnosis complete',
  value_finalized: 'Value finalized',
  customer_info_pending: 'Awaiting customer info',
  otp_verified: 'OTP verified',
  document_uploaded: 'Document uploaded',
  product_images_uploaded: 'Images uploaded',
  confirmed: 'Confirmed',
};

const RESUME_ROUTE: Record<string, (id: string) => string> = {
  valuation_ready: (id) => `/buyback/${id}/valuation`,
  diagnosis_pending: (id) => `/buyback/${id}/diagnosis`,
  diagnosis_completed: (id) => `/buyback/${id}/diagnosis`,
  value_finalized: (id) => `/buyback/${id}/customer`,
  customer_info_pending: (id) => `/buyback/${id}/customer`,
  otp_verified: (id) => `/buyback/${id}/document`,
  document_uploaded: (id) => `/buyback/${id}/document`,
  product_images_uploaded: (id) => `/buyback/${id}/review`,
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { reset: resetDraft } = useBuybackDraft();
  const [history, setHistory] = useState<BuybackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    buybackApi
      .list()
      .then(setHistory)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const confirmed = history.filter((h) => h.status === 'confirmed');
  const inProgress = history.filter((h) => h.status in RESUME_ROUTE);

  const handleStartNewBuyback = () => {
    resetDraft();
    navigate('/buyback/new');
  };

  return (
    <PageShell showBack={false}>
      <div className="dashboard-header">
        <div>
          <p>Welcome back</p>
          <h1>{user?.mobile ?? 'Buyback customer'}</h1>
        </div>
        <button className="dashboard-header__logout" onClick={logout} type="button">
          Log out
        </button>
      </div>

      <Card interactive onClick={handleStartNewBuyback} className="dashboard-cta">
        <div>
          <h2>Start a new buyback</h2>
          <p>Get an instant estimate for your smartphone, tablet, laptop or smartwatch.</p>
        </div>
        <span className="dashboard-cta__arrow">→</span>
      </Card>

      {loading && <Spinner label="Loading your history…" />}
      {error && <Banner tone="error">{error}</Banner>}

      {!loading && inProgress.length > 0 && (
        <section>
          <h3 className="dashboard-section-title">Continue where you left off</h3>
          <div className="dashboard-list">
            {inProgress.map((request) => (
              <Card
                key={request.id}
                interactive
                onClick={() => navigate((RESUME_ROUTE[request.status] ?? (() => '/'))(request.id))}
              >
                <div className="dashboard-list__row">
                  <div>
                    <strong>{request.model?.name ?? request.category?.name ?? 'Buyback request'}</strong>
                    <p>{STATUS_LABELS[request.status] ?? request.status}</p>
                  </div>
                  {request.maxValue !== undefined && <span className="dashboard-list__value">₹{request.maxValue}</span>}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <section>
          <h3 className="dashboard-section-title">History</h3>
          {confirmed.length === 0 ? (
            <Banner tone="info">Your confirmed buyback requests will show up here.</Banner>
          ) : (
            <div className="dashboard-list">
              {confirmed.map((request) => (
                <Card key={request.id}>
                  <div className="dashboard-list__row">
                    <div>
                      <strong>{request.displayId}</strong>
                      <p>
                        {request.model?.name} · {request.sku?.label}
                      </p>
                    </div>
                    <span className="dashboard-list__value">₹{request.finalValue}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}
