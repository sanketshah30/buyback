import { getSql } from '../../db/postgres';
import { AnswerTranslation } from '../../types/domain';
import { allocateId } from '../../utils/idGenerator';
import { AnswerTranslationRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const translations = new EntityTable<AnswerTranslation>(
  'answer_translations',
  'Answer translation',
  (row) => ({
    ...mapBaseEntity(row),
    answerId: toNum(row.answer_id),
    language: String(row.language),
    text: String(row.text),
  }),
  (t) => ({ ...baseEntityColumns(t), answer_id: t.answerId, language: t.language, text: t.text }),
);

export class PostgresAnswerTranslationRepository implements AnswerTranslationRepository {
  async upsert(translation: AnswerTranslation): Promise<AnswerTranslation> {
    const existing = await this.find(translation.answerId, translation.language);
    if (existing) {
      return translations.update(existing.id, { text: translation.text });
    }
    const record: AnswerTranslation = translation.id
      ? translation
      : { ...translation, id: await allocateId('answer_translations') };
    return translations.insert(record);
  }

  async listByAnswer(answerId: number): Promise<AnswerTranslation[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM answer_translations
      WHERE answer_id = ${answerId} AND is_active = true
      ORDER BY id
    `;
    return translations.mapRows(rows);
  }

  async find(answerId: number, language: string): Promise<AnswerTranslation | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM answer_translations
      WHERE answer_id = ${answerId} AND language = ${language} AND is_active = true
      ORDER BY id
      LIMIT 1
    `;
    return rows[0] ? translations.fromRow(rows[0]) : undefined;
  }
}
