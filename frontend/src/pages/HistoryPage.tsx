import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components/ui/Banner';
import { Card } from '../components/ui/Card';
import { PageShell } from '../components/ui/PageShell';
import { Spinner } from '../components/ui/Spinner';
import { buybackApi } from '../lib/buybackApi';
import type { BuybackRequest } from '../types/api';
import './DashboardPage.css';

export function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<BuybackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    buybackApi
      .list()
      .then((requests) => setHistory(requests.filter((request) => request.status === 'completed')))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell title="All requests" subtitle="Completed buyback history">
      {loading && <Spinner label="Loading your requests…" />}
      {error && <Banner tone="error">{error}</Banner>}

      {!loading && !error && history.length === 0 && (
        <Banner tone="info">Your completed buyback requests will show up here.</Banner>
      )}

      {!loading && history.length > 0 && (
        <div className="dashboard-list">
          {history.map((request) => (
            <Card key={request.id} interactive onClick={() => navigate(`/history/${request.id}`)}>
              <div className="dashboard-list__row">
                <div>
                  <strong>{request.referenceId}</strong>
                  <p>
                    {request.product?.name}
                    {request.sku?.label ? ` · ${request.sku.label}` : ''}
                  </p>
                </div>
                <span className="dashboard-list__value">₹{request.finalValue}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
