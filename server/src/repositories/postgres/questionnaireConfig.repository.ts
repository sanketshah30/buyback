import { getSql } from '../../db/postgres';
import {
  AnswerTranslation,
  MasterAnswer,
  MasterQuestion,
  QuestionAnswerMapping,
  QuestionTranslation,
  QuestionnaireConfig,
} from '../../types/domain';
import { QuestionnaireConfigRepository, ResolvedQuestionnaireQuestion } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum, toNumOrNull } from './helpers';

const FALLBACK_LANGUAGE = 'en';

const configs = new EntityTable<QuestionnaireConfig>(
  'questionnaire_config',
  'Questionnaire config',
  (row) => ({
    ...mapBaseEntity(row),
    productCategoryId: toNum(row.product_category_id),
    brandId: toNumOrNull(row.brand_id),
    partnerId: toNumOrNull(row.partner_id),
    questionAnswerId: toNum(row.question_answer_id),
    sequence: toNum(row.sequence),
  }),
  (c) => ({
    ...baseEntityColumns(c),
    product_category_id: c.productCategoryId,
    brand_id: c.brandId,
    partner_id: c.partnerId,
    question_answer_id: c.questionAnswerId,
    sequence: c.sequence,
  }),
);

function findTranslatedText(
  translations: { language: string; text: string; isActive: boolean }[],
  language: string,
): string | undefined {
  return (
    translations.find((t) => t.language === language && t.isActive)?.text ??
    translations.find((t) => t.language === FALLBACK_LANGUAGE && t.isActive)?.text ??
    translations.find((t) => t.isActive)?.text
  );
}

export class PostgresQuestionnaireConfigRepository implements QuestionnaireConfigRepository {
  async create(config: QuestionnaireConfig): Promise<QuestionnaireConfig> {
    return configs.insert(config);
  }

  async update(id: number, patch: Partial<QuestionnaireConfig>): Promise<QuestionnaireConfig> {
    return configs.update(id, patch);
  }

  async findById(id: number): Promise<QuestionnaireConfig | undefined> {
    return configs.get(id);
  }

  async list(filter?: {
    productCategoryId?: number;
    brandId?: number | null;
    partnerId?: number | null;
    isActive?: boolean;
  }): Promise<QuestionnaireConfig[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM questionnaire_config
      WHERE true
      ${filter?.productCategoryId !== undefined ? sql`AND product_category_id = ${filter.productCategoryId}` : sql``}
      ${
        filter?.brandId === undefined
          ? sql``
          : filter.brandId === null
            ? sql`AND brand_id IS NULL`
            : sql`AND brand_id = ${filter.brandId}`
      }
      ${
        filter?.partnerId === undefined
          ? sql``
          : filter.partnerId === null
            ? sql`AND partner_id IS NULL`
            : sql`AND partner_id = ${filter.partnerId}`
      }
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return configs.mapRows(rows);
  }

  async resolve(
    productCategoryId: number,
    brandId: number | undefined,
    partnerId: number | undefined,
    language: string,
  ): Promise<ResolvedQuestionnaireQuestion[]> {
    // Most-specific tier first; the first tier with any active rows wins.
    const tiers: { brandId: number | null; partnerId: number | null }[] = [];
    if (brandId !== undefined && partnerId !== undefined) tiers.push({ brandId, partnerId });
    if (partnerId !== undefined) tiers.push({ brandId: null, partnerId });
    if (brandId !== undefined) tiers.push({ brandId, partnerId: null });
    tiers.push({ brandId: null, partnerId: null });

    const sql = getSql();
    let matched: QuestionnaireConfig[] = [];
    for (const tier of tiers) {
      const rows = await sql<SqlRow[]>`
        SELECT * FROM questionnaire_config
        WHERE product_category_id = ${productCategoryId}
          AND ${tier.brandId === null ? sql`brand_id IS NULL` : sql`brand_id = ${tier.brandId}`}
          AND ${tier.partnerId === null ? sql`partner_id IS NULL` : sql`partner_id = ${tier.partnerId}`}
          AND is_active = true
        ORDER BY sequence, id
      `;
      if (rows.length > 0) {
        matched = configs.mapRows(rows);
        break;
      }
    }
    if (matched.length === 0) return [];

    const qaIds = [...new Set(matched.map((c) => c.questionAnswerId))];
    const mappings = await this.loadMappings(qaIds);
    const mappingById = new Map(mappings.map((m) => [m.id, m]));

    const grouped = new Map<number, { sequence: number; questionAnswerIds: number[] }>();
    for (const config of matched) {
      const mapping = mappingById.get(config.questionAnswerId);
      if (!mapping) continue;
      const entry = grouped.get(mapping.questionId) ?? { sequence: config.sequence, questionAnswerIds: [] };
      entry.questionAnswerIds.push(config.questionAnswerId);
      grouped.set(mapping.questionId, entry);
    }

    const questionIds = [...grouped.keys()];
    const questions = await this.loadQuestions(questionIds);
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const questionTranslations = await this.loadQuestionTranslations(questionIds);
    const answerIds = [...new Set(mappings.map((m) => m.answerId))];
    const answers = await this.loadAnswers(answerIds);
    const answerById = new Map(answers.map((a) => [a.id, a]));
    const answerTranslations = await this.loadAnswerTranslations(answerIds);

    const results: ResolvedQuestionnaireQuestion[] = [];
    for (const [questionId, { sequence, questionAnswerIds }] of grouped) {
      const question = questionById.get(questionId);
      if (!question || !question.isActive) continue;

      const qTranslations = questionTranslations.filter((t) => t.questionId === questionId);
      const questionText = findTranslatedText(qTranslations, language) ?? String(questionId);

      const resolvedAnswers: ResolvedQuestionnaireQuestion['answers'] = [];
      for (const qaId of questionAnswerIds) {
        const qam = mappingById.get(qaId);
        if (!qam || !qam.isActive) continue;
        const answer = answerById.get(qam.answerId);
        if (!answer || !answer.isActive) continue;
        const aTranslations = answerTranslations.filter((t) => t.answerId === answer.id);
        const answerText = findTranslatedText(aTranslations, language) ?? answer.code;
        resolvedAnswers.push({
          questionAnswerId: qaId,
          answerId: answer.id,
          code: answer.code,
          text: answerText,
        });
      }

      results.push({
        questionId,
        type: question.type,
        sequence,
        text: questionText,
        answers: resolvedAnswers,
      });
    }

    results.sort((a, b) => a.sequence - b.sequence);
    return results;
  }

  private async loadMappings(ids: number[]): Promise<QuestionAnswerMapping[]> {
    if (ids.length === 0) return [];
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM question_answer_mapping WHERE id = ANY(${ids}::bigint[])`;
    return rows.map((row) => ({
      ...mapBaseEntity(row),
      questionId: toNum(row.question_id),
      answerId: toNum(row.answer_id),
    }));
  }

  private async loadQuestions(ids: number[]): Promise<MasterQuestion[]> {
    if (ids.length === 0) return [];
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM questions WHERE id = ANY(${ids}::bigint[])`;
    return rows.map((row) => ({ ...mapBaseEntity(row), type: row.type as MasterQuestion['type'] }));
  }

  private async loadAnswers(ids: number[]): Promise<MasterAnswer[]> {
    if (ids.length === 0) return [];
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM answers WHERE id = ANY(${ids}::bigint[])`;
    return rows.map((row) => ({ ...mapBaseEntity(row), code: String(row.code) }));
  }

  private async loadQuestionTranslations(questionIds: number[]): Promise<QuestionTranslation[]> {
    if (questionIds.length === 0) return [];
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM question_translations WHERE question_id = ANY(${questionIds}::bigint[]) ORDER BY id
    `;
    return rows.map((row) => ({
      ...mapBaseEntity(row),
      questionId: toNum(row.question_id),
      language: String(row.language),
      text: String(row.text),
    }));
  }

  private async loadAnswerTranslations(answerIds: number[]): Promise<AnswerTranslation[]> {
    if (answerIds.length === 0) return [];
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM answer_translations WHERE answer_id = ANY(${answerIds}::bigint[]) ORDER BY id
    `;
    return rows.map((row) => ({
      ...mapBaseEntity(row),
      answerId: toNum(row.answer_id),
      language: String(row.language),
      text: String(row.text),
    }));
  }
}
