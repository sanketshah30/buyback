/**
 * Minimal secondary-index helper for the in-memory store: a `Map<K, Set<number>>`
 * mapping an indexed column value to the primary-key IDs of matching rows,
 * so lookups by a foreign key (or other frequently-queried column) are O(1)
 * instead of a full linear scan - the same job a real `CREATE INDEX` does.
 */
export type Index<K> = Map<K, Set<number>>;

export function addToIndex<K>(index: Index<K>, key: K, id: number): void {
  let bucket = index.get(key);
  if (!bucket) {
    bucket = new Set<number>();
    index.set(key, bucket);
  }
  bucket.add(id);
}

export function removeFromIndex<K>(index: Index<K>, key: K, id: number): void {
  index.get(key)?.delete(id);
}

export function getIndexed<K, T>(index: Index<K>, key: K, table: Map<number, T>): T[] {
  const ids = index.get(key);
  if (!ids) return [];
  const rows: T[] = [];
  for (const id of ids) {
    const row = table.get(id);
    if (row) rows.push(row);
  }
  return rows;
}
