import { getSql } from '../../db/postgres';

/**
 * Thin helper around JSONB document tables shaped as (id bigint PK, data jsonb).
 * Repositories keep domain types 1:1 inside `data`.
 */
export class JsonDocStore<T extends { id: number }> {
  constructor(private readonly table: string) {}

  async insert(row: T): Promise<T> {
    const sql = getSql();
    await sql`
      INSERT INTO ${sql(this.table)} (id, data)
      VALUES (${row.id}, ${sql.json(row as never)})
    `;
    return row;
  }

  async upsert(row: T): Promise<T> {
    const sql = getSql();
    await sql`
      INSERT INTO ${sql(this.table)} (id, data)
      VALUES (${row.id}, ${sql.json(row as never)})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
    return row;
  }

  async get(id: number): Promise<T | undefined> {
    const sql = getSql();
    const rows = await sql<{ data: T }[]>`
      SELECT data FROM ${sql(this.table)} WHERE id = ${id}
    `;
    return rows[0]?.data;
  }

  async replace(id: number, row: T): Promise<T> {
    const sql = getSql();
    const rows = await sql<{ data: T }[]>`
      UPDATE ${sql(this.table)}
      SET data = ${sql.json(row as never)}
      WHERE id = ${id}
      RETURNING data
    `;
    if (!rows[0]) {
      throw notFound(this.table, id);
    }
    return rows[0].data;
  }

  async listAll(): Promise<T[]> {
    const sql = getSql();
    const rows = await sql<{ data: T }[]>`
      SELECT data FROM ${sql(this.table)}
    `;
    return rows.map((r) => r.data);
  }

  async findByJsonText(field: string, value: string): Promise<T | undefined> {
    const sql = getSql();
    const rows = await sql<{ data: T }[]>`
      SELECT data FROM ${sql(this.table)}
      WHERE data->>${field} = ${value}
      LIMIT 1
    `;
    return rows[0]?.data;
  }

  async findByJsonInt(field: string, value: number): Promise<T[]> {
    const sql = getSql();
    const rows = await sql<{ data: T }[]>`
      SELECT data FROM ${sql(this.table)}
      WHERE (data->>${field})::bigint = ${value}
    `;
    return rows.map((r) => r.data);
  }

  async findByJsonIntPair(fieldA: string, valueA: number, fieldB: string, valueB: number): Promise<T[]> {
    const sql = getSql();
    const rows = await sql<{ data: T }[]>`
      SELECT data FROM ${sql(this.table)}
      WHERE (data->>${fieldA})::bigint = ${valueA}
        AND (data->>${fieldB})::bigint = ${valueB}
    `;
    return rows.map((r) => r.data);
  }
}

export function notFound(entity: string, id: number | string): Error {
  return Object.assign(new Error(`${entity} ${id} not found`), { status: 404 });
}

export function nowIso(): string {
  return new Date().toISOString();
}
