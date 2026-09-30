import { env } from '../config/env';
import { getSql } from '../db/postgres';

/**
 * Emulates a real database's auto-increment integer primary key, per table.
 * Every entity's primary key is a sequential integer (never a UUID) so it
 * maps cleanly onto a real SQL `INT AUTO_INCREMENT PRIMARY KEY` column once
 * this moves off the in-memory mock store.
 */
const counters = new Map<string, number>();

function isPostgresDriver(): boolean {
  return env.dataDriver === 'postgres' || env.dataDriver === 'supabase';
}

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

/**
 * Async ID allocator. On postgres/supabase drivers, atomically bumps
 * `id_sequences.last_value` and returns it. Otherwise falls back to sync `nextId`.
 */
export async function allocateId(table: string): Promise<number> {
  if (!isPostgresDriver()) {
    return nextId(table);
  }

  const sql = getSql();
  const rows = await sql<{ last_value: string | number }[]>`
    INSERT INTO id_sequences (table_name, last_value)
    VALUES (${table}, 1)
    ON CONFLICT (table_name) DO UPDATE
      SET last_value = id_sequences.last_value + 1
    RETURNING last_value
  `;
  return Number(rows[0].last_value);
}
