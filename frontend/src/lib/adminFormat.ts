/** ISO timestamp -> YYYY-MM-DD (what <input type="date"> expects and a good table label). */
export function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function formatDate(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : '—';
}

/** Full timestamp for audit columns (created_at / updated_at). */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
