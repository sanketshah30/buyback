import { useEffect, useState } from 'react';
import { getAdminErrorMessage } from '../lib/adminErrors';
import type { SelectOption } from '../components/ui/Select';

/** Loads a list used to populate select inputs / resolve ids to names in tables. */
export function useAdminLookup<T>(fetcher: () => Promise<T[]>, label: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(`Could not load ${label}: ${getAdminErrorMessage(err)}`))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  return { items, loading, error };
}

/** Select options from a lookup list: active rows only, plus whichever row is currently selected (so editing an old record still shows its value). */
export function toOptions<T extends { id: number; isActive: boolean }>(
  items: T[],
  label: (item: T) => string,
  selectedId?: string | number | null,
): SelectOption[] {
  return items
    .filter((item) => item.isActive || String(item.id) === String(selectedId ?? ''))
    .map((item) => ({ value: String(item.id), label: label(item) }));
}

/** id -> display name resolver for table cells. */
export function nameResolver<T extends { id: number }>(items: T[], label: (item: T) => string) {
  const map = new Map(items.map((item) => [item.id, label(item)]));
  return (id: number | null | undefined, fallback = '—') => (id === null || id === undefined ? fallback : (map.get(id) ?? `#${id}`));
}
