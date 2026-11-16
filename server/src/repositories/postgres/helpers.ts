import { getSql } from '../../db/postgres';
import { BaseEntity } from '../../types/domain';

/**
 * Shared utilities for the normalized (real columns + FKs) Postgres
 * repositories. Each repository defines its own `fromRow` / `toRow` pair that
 * maps between snake_case columns and the camelCase domain types.
 */

export type SqlRow = Record<string, unknown>;

export function nowIso(): string {
  return new Date().toISOString();
}

export function notFound(entity: string, id: number | string): Error {
  return Object.assign(new Error(`${entity} ${id} not found`), { status: 404 });
}

/** timestamptz / date values come back from postgres.js as `Date`; domain types use ISO strings. */
export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  return String(value);
}

export function toIsoOrUndefined(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : toIso(value);
}

/** bigint / numeric columns arrive as strings from postgres.js. */
export function toNum(value: unknown): number {
  return Number(value);
}

export function toNumOrUndefined(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : Number(value);
}

export function toNumOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

export function toStrOrUndefined(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

/** Maps the shared audit columns (id, created_at, updated_at, is_active) of a row onto BaseEntity. */
export function mapBaseEntity(row: SqlRow): BaseEntity {
  return {
    id: Number(row.id),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    isActive: Boolean(row.is_active),
  };
}

/** Inverse of mapBaseEntity - the audit columns for an INSERT/UPDATE row. */
export function baseEntityColumns(entity: BaseEntity): SqlRow {
  return {
    id: entity.id,
    created_at: entity.createdAt,
    updated_at: entity.updatedAt,
    is_active: entity.isActive,
  };
}

/** camelCase -> snake_case (e.g. `partnerLocationId` -> `partner_location_id`). */
export function toSnakeCase(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** snake_case -> camelCase. */
export function toCamelCase(name: string): string {
  return name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Converts a flat camelCase object to snake_case column keys (undefined values are kept so they can be nulled). */
export function toSnakeColumns(obj: Record<string, unknown>): SqlRow {
  const out: SqlRow = {};
  for (const [key, value] of Object.entries(obj)) out[toSnakeCase(key)] = value;
  return out;
}

/** postgres.js rejects `undefined`; map to NULL. Plain arrays are sent as postgres arrays. */
function prepare(row: SqlRow): SqlRow {
  const sql = getSql();
  const out: SqlRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) out[key] = null;
    else if (Array.isArray(value)) out[key] = sql.array(value as string[]);
    else out[key] = value;
  }
  return out;
}

export async function insertRow(table: string, row: SqlRow): Promise<SqlRow> {
  const sql = getSql();
  const rows = await sql<SqlRow[]>`
    INSERT INTO ${sql(table)} ${sql(prepare(row) as never)}
    RETURNING *
  `;
  return rows[0];
}

/** Updates every column in `row` for the given id. Returns undefined when no row matched. */
export async function updateRowById(table: string, id: number, row: SqlRow): Promise<SqlRow | undefined> {
  const sql = getSql();
  const rows = await sql<SqlRow[]>`
    UPDATE ${sql(table)}
    SET ${sql(prepare(row) as never)}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}

/**
 * Typed CRUD helper over a normalized table with the standard audit columns.
 * `fromRow`/`toRow` do the snake_case <-> camelCase mapping; `toRow` must
 * include `id`, `created_at`, `updated_at`, `is_active` (use baseEntityColumns).
 */
export class EntityTable<T extends BaseEntity> {
  constructor(
    readonly table: string,
    private readonly label: string,
    readonly fromRow: (row: SqlRow) => T,
    private readonly toRow: (entity: T) => SqlRow,
  ) {}

  async insert(entity: T): Promise<T> {
    return this.fromRow(await insertRow(this.table, this.toRow(entity)));
  }

  async get(id: number): Promise<T | undefined> {
    const row = await selectById(this.table, id);
    return row ? this.fromRow(row) : undefined;
  }

  async all(orderBy = 'id'): Promise<T[]> {
    return (await selectAll(this.table, orderBy)).map(this.fromRow);
  }

  async update(id: number, patch: Partial<T>): Promise<T> {
    const existing = await this.get(id);
    if (!existing) throw notFound(this.label, id);
    const merged: T = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    };
    const { id: _id, created_at: _createdAt, ...columns } = this.toRow(merged);
    const row = await updateRowById(this.table, id, columns);
    if (!row) throw notFound(this.label, id);
    return this.fromRow(row);
  }

  mapRows(rows: SqlRow[]): T[] {
    return rows.map(this.fromRow);
  }
}

export async function selectById(table: string, id: number): Promise<SqlRow | undefined> {
  const sql = getSql();
  const rows = await sql<SqlRow[]>`SELECT * FROM ${sql(table)} WHERE id = ${id}`;
  return rows[0];
}

export async function selectAll(table: string, orderBy = 'id'): Promise<SqlRow[]> {
  const sql = getSql();
  return sql<SqlRow[]>`SELECT * FROM ${sql(table)} ORDER BY ${sql(orderBy)}`;
}
