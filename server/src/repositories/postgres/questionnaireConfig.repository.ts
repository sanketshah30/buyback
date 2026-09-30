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
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<QuestionnaireConfig>('questionnaire_configs');
const FALLBACK_LANGUAGE = 'en';

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

function brandKey(brandId: number | null): string {
  return brandId === null ? 'null' : String(brandId);
}

function partnerKey(partnerId: number | null): string {
  return partnerId === null ? 'null' : String(partnerId);
}

export class PostgresQuestionnaireConfigRepository implements QuestionnaireConfigRepository {
  async create(config: QuestionnaireConfig): Promise<QuestionnaireConfig> {
    return store.insert(config);
  }

  async update(id: number, patch: Partial<QuestionnaireConfig>): Promise<QuestionnaireConfig> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Questionnaire config', id);
    const updated: QuestionnaireConfig = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<QuestionnaireConfig | undefined> {
    return store.get(id);
  }

  async list(filter?: {
    productCategoryId?: number;
    brandId?: number | null;
    partnerId?: number | null;
    isActive?: boolean;
  }): Promise<QuestionnaireConfig[]> {
    let result =
      filter?.productCategoryId !== undefined
        ? await store.findByJsonInt('productCategoryId', filter.productCategoryId)
        : await store.listAll();
    if (filter?.brandId !== undefined) result = result.filter((c) => c.brandId === filter.brandId);
    if (filter?.partnerId !== undefined) result = result.filter((c) => c.partnerId === filter.partnerId);
    if (filter?.isActive !== undefined) result = result.filter((c) => c.isActive === filter.isActive);
    return result;
  }

  async resolve(
    productCategoryId: number,
    brandId: number | undefined,
    partnerId: number | undefined,
    language: string,
  ): Promise<ResolvedQuestionnaireQuestion[]> {
    const tiers: { brandId: number | null; partnerId: number | null }[] = [];
    if (brandId !== undefined && partnerId !== undefined) tiers.push({ brandId, partnerId });
    if (partnerId !== undefined) tiers.push({ brandId: null, partnerId });
    if (brandId !== undefined) tiers.push({ brandId, partnerId: null });
    tiers.push({ brandId: null, partnerId: null });

    let matched: QuestionnaireConfig[] = [];
    const sql = getSql();
    for (const tier of tiers) {
      const rows = await sql<{ data: QuestionnaireConfig }[]>`
        SELECT data FROM questionnaire_configs
        WHERE (data->>'productCategoryId')::bigint = ${productCategoryId}
          AND COALESCE(data->>'brandId', 'null') = ${brandKey(tier.brandId)}
          AND COALESCE(data->>'partnerId', 'null') = ${partnerKey(tier.partnerId)}
          AND (data->>'isActive')::boolean = true
      `;
      if (rows.length > 0) {
        matched = rows.map((r) => r.data);
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
    const rows = await sql<{ data: QuestionAnswerMapping }[]>`
      SELECT data FROM question_answer_mappings WHERE id = ANY(${ids})
    `;
    return rows.map((r) => r.data);
  }

  private async loadQuestions(ids: number[]): Promise<MasterQuestion[]> {
    if (ids.length === 0) return [];
    const sql = getSql();
    const rows = await sql<{ data: MasterQuestion }[]>`
      SELECT data FROM master_questions WHERE id = ANY(${ids})
    `;
    return rows.map((r) => r.data);
  }

  private async loadAnswers(ids: number[]): Promise<MasterAnswer[]> {
    if (ids.length === 0) return [];
    const sql = getSql();
    const rows = await sql<{ data: MasterAnswer }[]>`
      SELECT data FROM master_answers WHERE id = ANY(${ids})
    `;
    return rows.map((r) => r.data);
  }

  private async loadQuestionTranslations(questionIds: number[]): Promise<QuestionTranslation[]> {
    if (questionIds.length === 0) return [];
    const sql = getSql();
    const rows = await sql<{ data: QuestionTranslation }[]>`
      SELECT data FROM question_translations
      WHERE (data->>'questionId')::bigint = ANY(${questionIds})
    `;
    return rows.map((r) => r.data);
  }

  private async loadAnswerTranslations(answerIds: number[]): Promise<AnswerTranslation[]> {
    if (answerIds.length === 0) return [];
    const sql = getSql();
    const rows = await sql<{ data: AnswerTranslation }[]>`
      SELECT data FROM answer_translations
      WHERE (data->>'answerId')::bigint = ANY(${answerIds})
    `;
    return rows.map((r) => r.data);
  }
}
