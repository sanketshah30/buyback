import { getSql } from '../../db/postgres';
import { QuestionTranslation } from '../../types/domain';
import { allocateId } from '../../utils/idGenerator';
import { QuestionTranslationRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const translations = new EntityTable<QuestionTranslation>(
  'question_translations',
  'Question translation',
  (row) => ({
    ...mapBaseEntity(row),
    questionId: toNum(row.question_id),
    language: String(row.language),
    text: String(row.text),
  }),
  (t) => ({ ...baseEntityColumns(t), question_id: t.questionId, language: t.language, text: t.text }),
);

export class PostgresQuestionTranslationRepository implements QuestionTranslationRepository {
  async upsert(translation: QuestionTranslation): Promise<QuestionTranslation> {
    const existing = await this.find(translation.questionId, translation.language);
    if (existing) {
      return translations.update(existing.id, { text: translation.text });
    }
    const record: QuestionTranslation = translation.id
      ? translation
      : { ...translation, id: await allocateId('question_translations') };
    return translations.insert(record);
  }

  async listByQuestion(questionId: number): Promise<QuestionTranslation[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM question_translations
      WHERE question_id = ${questionId} AND is_active = true
      ORDER BY id
    `;
    return translations.mapRows(rows);
  }

  async find(questionId: number, language: string): Promise<QuestionTranslation | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM question_translations
      WHERE question_id = ${questionId} AND language = ${language} AND is_active = true
      ORDER BY id
      LIMIT 1
    `;
    return rows[0] ? translations.fromRow(rows[0]) : undefined;
  }
}
