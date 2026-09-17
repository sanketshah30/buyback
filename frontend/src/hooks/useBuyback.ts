import { useCallback, useEffect, useState } from 'react';
import { buybackApi } from '../lib/buybackApi';
import type { BuybackRequest } from '../types/api';

export function useBuyback(id: string | undefined) {
  const [data, setData] = useState<BuybackRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const request = await buybackApi.get(id);
      setData(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buyback request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, setData, loading, error, refetch };
}
