/**
 * Emulates a real database's auto-increment integer primary key, per table.
 * Every entity's primary key is a sequential integer (never a UUID) so it
 * maps cleanly onto a real SQL `INT AUTO_INCREMENT PRIMARY KEY` column once
 * this moves off the in-memory mock store.
 */
const counters = new Map<string, number>();

export function nextId(table: string): number {
  const current = counters.get(table) ?? 0;
  const next = current + 1;
  counters.set(table, next);
  return next;
}

/** Lets seed data pre-register the highest ID already used for a table, so IDs created via the API afterward keep counting up without colliding with seeded rows. */
export function reserveIdRange(table: string, highestUsedId: number): void {
  const current = counters.get(table) ?? 0;
  if (highestUsedId > current) counters.set(table, highestUsedId);
}
