import type { ReactNode } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Banner } from './ui/Banner';
import './OfflineGate.css';

/**
 * Per the product spec: "Check for internet connection before initiating
 * the application". Blocks the whole app with a clear retry screen when
 * offline, and re-renders children automatically once connectivity returns.
 */
export function OfflineGate({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="offline-gate">
        <div className="offline-gate__icon">📶</div>
        <h1>You're offline</h1>
        <p>Buyback needs an internet connection to fetch live pricing and assessment data. We'll pick up automatically once you're back online.</p>
        <Banner tone="warning">Waiting for connection…</Banner>
      </div>
    );
  }

  return <>{children}</>;
}
