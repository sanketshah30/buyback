import { getSql } from '../../db/postgres';
import { QuestionAnswerMapping } from '../../types/domain';
import { QuestionAnswerMappingRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const mappings = new EntityTable<QuestionAnswerMapping>(
  'question_answer_mapping',
  'Question answer mapping',
  (row) => ({
    ...mapBaseEntity(row),
    questionId: toNum(row.question_id),
    answerId: toNum(row.answer_id),
  }),
  (m) => ({ ...baseEntityColumns(m), question_id: m.questionId, answer_id: m.answerId }),
);

export class PostgresQuestionAnswerMappingRepository implements QuestionAnswerMappingRepository {
  async create(mapping: QuestionAnswerMapping): Promise<QuestionAnswerMapping> {
    return mappings.insert(mapping);
  }

  async update(id: number, patch: Partial<QuestionAnswerMapping>): Promise<QuestionAnswerMapping> {
    return mappings.update(id, patch);
  }

  async findById(id: number): Promise<QuestionAnswerMapping | undefined> {
    return mappings.get(id);
  }

  async listByQuestion(questionId: number): Promise<QuestionAnswerMapping[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM question_answer_mapping
      WHERE question_id = ${questionId} AND is_active = true
      ORDER BY id
    `;
    return mappings.mapRows(rows);
  }

  async list(filter?: { isActive?: boolean }): Promise<QuestionAnswerMapping[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM question_answer_mapping
      WHERE true
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return mappings.mapRows(rows);
  }
}
