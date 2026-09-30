import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { closeSql, getMigrateSql } from './postgres';

async function migrate(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const sql = getMigrateSql();
  await sql.unsafe(schema);
  // eslint-disable-next-line no-console
  console.log('Migration complete: schema.sql applied.');
  await closeSql();
}

migrate().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', err);
  await closeSql().catch(() => undefined);
  process.exit(1);
});
