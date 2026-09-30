import postgres from 'postgres';
import { env } from '../config/env';

type Sql = ReturnType<typeof postgres>;

let sql: Sql | undefined;
let migrateSql: Sql | undefined;

function createClient(url: string, max: number): Sql {
  return postgres(url, {
    ssl: 'require',
    max,
    idle_timeout: 20,
    connect_timeout: 30,
  });
}

/** Pooled client for app/runtime queries (Supabase pooler via POSTGRES_URL). */
export function getSql(): Sql {
  if (sql) return sql;
  const url = env.postgresUrl;
  if (!url) {
    throw new Error('POSTGRES_URL (or DATABASE_URL) is required when using the postgres data driver');
  }
  sql = createClient(url, 1);
  return sql;
}

/**
 * Direct (non-pooling) client for migrate/seed scripts.
 * Prefer POSTGRES_URL_NON_POOLING so DDL isn't routed through a transaction pooler.
 */
export function getMigrateSql(): Sql {
  if (migrateSql) return migrateSql;
  const url = env.postgresUrlDirect || env.postgresUrl;
  if (!url) {
    throw new Error('POSTGRES_URL_NON_POOLING or POSTGRES_URL is required for migrate/seed');
  }
  migrateSql = createClient(url, 1);
  return migrateSql;
}

export async function closeSql(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = undefined;
  }
  if (migrateSql) {
    await migrateSql.end({ timeout: 5 });
    migrateSql = undefined;
  }
}
