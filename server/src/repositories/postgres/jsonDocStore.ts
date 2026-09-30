import { getSql } from '../../db/postgres';

/**
 * Thin helper around JSONB document tables shaped as (id bigint PK, data jsonb).
 * Repositories keep domain types 1:1 inside `data`.
 *
 * Defensive parse: if a row was accidentally stored as a JSON *string* inside
 * jsonb (double-encoded, which shows up as backslash-escaped quotes in the
 * Supabase UI), decode it back to an object so `userId` / field access works.
 */
export class JsonDocStore<T extends { id: number }> {
  constructor(private readonly table: string) {}

  async insert(row: T): Promise<T> {
    const sql = getSql();
    await sql`
      INSERT INTO ${sql(this.table)} (id, data)
      VALUES (${row.id}, ${sql.json(asJsonObject(row) as never)})
    `;
    return row;
  }

  async upsert(row: T): Promise<T> {
    const sql = getSql();
    await sql`
      INSERT INTO ${sql(this.table)} (id, data)
      VALUES (${row.id}, ${sql.json(asJsonObject(row) as never)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
    return row;
  }

  async get(id: number): Promise<T | undefined> {
    const sql = getSql();
    const rows = await sql<{ data: unknown }[]>`
      SELECT data FROM ${sql(this.table)} WHERE id = ${id}
    `;
    return decodeDoc<T>(rows[0]?.data);
  }

  async replace(id: number, row: T): Promise<T> {
    const sql = getSql();
    const rows = await sql<{ data: unknown }[]>`
      UPDATE ${sql(this.table)}
      SET data = ${sql.json(asJsonObject(row) as never)}
      WHERE id = ${id}
      RETURNING data
    `;
    if (!rows[0]) {
      throw notFound(this.table, id);
    }
    return decodeDoc<T>(rows[0].data) as T;
  }

  async listAll(): Promise<T[]> {
    const sql = getSql();
    const rows = await sql<{ data: unknown }[]>`
      SELECT data FROM ${sql(this.table)}
    `;
    return rows.map((r) => decodeDoc<T>(r.data)).filter((row): row is T => row !== undefined);
  }

  async findByJsonText(field: string, value: string): Promise<T | undefined> {
    const sql = getSql();
    const rows = await sql<{ data: unknown }[]>`
      SELECT data FROM ${sql(this.table)}
      WHERE (
          jsonb_typeof(data) = 'object'
          AND data->>${field} = ${value}
        )
        OR (
          jsonb_typeof(data) = 'string'
          AND (data#>>'{}')::jsonb->>${field} = ${value}
        )
      LIMIT 1
    `;
    return decodeDoc<T>(rows[0]?.data);
  }

  async findByJsonInt(field: string, value: number): Promise<T[]> {
    const sql = getSql();
    // Support both normal jsonb objects and double-encoded jsonb strings.
    const rows = await sql<{ data: unknown }[]>`
      SELECT data FROM ${sql(this.table)}
      WHERE (
          jsonb_typeof(data) = 'object'
          AND (data->>${field})::bigint = ${value}
        )
        OR (
          jsonb_typeof(data) = 'string'
          AND ((data#>>'{}')::jsonb->>${field})::bigint = ${value}
        )
    `;
    return rows.map((r) => decodeDoc<T>(r.data)).filter((row): row is T => row !== undefined);
  }

  async findByJsonIntPair(fieldA: string, valueA: number, fieldB: string, valueB: number): Promise<T[]> {
    const sql = getSql();
    const rows = await sql<{ data: unknown }[]>`
      SELECT data FROM ${sql(this.table)}
      WHERE (
          jsonb_typeof(data) = 'object'
          AND (data->>${fieldA})::bigint = ${valueA}
          AND (data->>${fieldB})::bigint = ${valueB}
        )
        OR (
          jsonb_typeof(data) = 'string'
          AND ((data#>>'{}')::jsonb->>${fieldA})::bigint = ${valueA}
          AND ((data#>>'{}')::jsonb->>${fieldB})::bigint = ${valueB}
        )
    `;
    return rows.map((r) => decodeDoc<T>(r.data)).filter((row): row is T => row !== undefined);
  }
}

function asJsonObject(row: unknown): object {
  const decoded = decodeDoc(row);
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new Error('Document store requires a plain object payload');
  }
  return decoded as object;
}

/** Unwrap jsonb that was stored as a JSON string (double-encoded). */
export function decodeDoc<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) return undefined;
  let current: unknown = value;
  // A few layers of accidental stringify are enough to recover.
  for (let i = 0; i < 3; i += 1) {
    if (typeof current === 'string') {
      try {
        current = JSON.parse(current);
        continue;
      } catch {
        return undefined;
      }
    }
    break;
  }
  if (typeof current !== 'object' || current === null) return undefined;
  return current as T;
}

export function notFound(entity: string, id: number | string): Error {
  return Object.assign(new Error(`${entity} ${id} not found`), { status: 404 });
}

export function nowIso(): string {
  return new Date().toISOString();
}
