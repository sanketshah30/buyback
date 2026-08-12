export function dateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Formats a buyback display ID as {{YYYYMMDD}}-{{Count}}, per the product spec. */
export function formatBuybackDisplayId(sequence: number, date = new Date()): string {
  return `${dateKey(date)}-${sequence}`;
}
