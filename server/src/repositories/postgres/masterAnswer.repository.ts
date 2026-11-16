import { getSql } from '../../db/postgres';
import { MasterAnswer } from '../../types/domain';
import { MasterAnswerRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity } from './helpers';

const answers = new EntityTable<MasterAnswer>(
  'answers',
  'Master answer',
  (row) => ({ ...mapBaseEntity(row), code: String(row.code) }),
  (a) => ({ ...baseEntityColumns(a), code: a.code }),
);

export class PostgresMasterAnswerRepository implements MasterAnswerRepository {
  async create(answer: MasterAnswer): Promise<MasterAnswer> {
    return answers.insert(answer);
  }

  async update(id: number, patch: Partial<MasterAnswer>): Promise<MasterAnswer> {
    return answers.update(id, patch);
  }

  async findById(id: number): Promise<MasterAnswer | undefined> {
    return answers.get(id);
  }

  async findByCode(code: string): Promise<MasterAnswer | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM answers WHERE code = ${code} ORDER BY is_active DESC, id LIMIT 1
    `;
    return rows[0] ? answers.fromRow(rows[0]) : undefined;
  }

  async list(filter?: { isActive?: boolean }): Promise<MasterAnswer[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM answers
      WHERE true
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return answers.mapRows(rows);
  }
}
