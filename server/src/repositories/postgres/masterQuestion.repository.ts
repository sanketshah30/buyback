import { getSql } from '../../db/postgres';
import { MasterQuestion } from '../../types/domain';
import { MasterQuestionRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity } from './helpers';

const questions = new EntityTable<MasterQuestion>(
  'questions',
  'Master question',
  (row) => ({ ...mapBaseEntity(row), type: row.type as MasterQuestion['type'] }),
  (q) => ({ ...baseEntityColumns(q), type: q.type }),
);

export class PostgresMasterQuestionRepository implements MasterQuestionRepository {
  async create(question: MasterQuestion): Promise<MasterQuestion> {
    return questions.insert(question);
  }

  async update(id: number, patch: Partial<MasterQuestion>): Promise<MasterQuestion> {
    return questions.update(id, patch);
  }

  async findById(id: number): Promise<MasterQuestion | undefined> {
    return questions.get(id);
  }

  async list(filter?: { isActive?: boolean }): Promise<MasterQuestion[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM questions
      WHERE true
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return questions.mapRows(rows);
  }
}
