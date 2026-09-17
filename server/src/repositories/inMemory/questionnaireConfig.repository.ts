import { QuestionnaireConfig } from '../../types/domain';
import { QuestionnaireConfigRepository, ResolvedQuestionnaireQuestion } from '../interfaces';
import { indexes, profileKey, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

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

export class InMemoryQuestionnaireConfigRepository implements QuestionnaireConfigRepository {
  async create(config: QuestionnaireConfig): Promise<QuestionnaireConfig> {
    tables.questionnaireConfigs.set(config.id, config);
    addToIndex(indexes.questionnaireConfigsByProfile, profileKey(config.productCategoryId, config.brandId, config.partnerId), config.id);
    addToIndex(indexes.questionnaireConfigsByCategory, config.productCategoryId, config.id);
    return config;
  }

  async update(id: number, patch: Partial<QuestionnaireConfig>): Promise<QuestionnaireConfig> {
    const existing = tables.questionnaireConfigs.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Questionnaire config ${id} not found`), { status: 404 });
    }
    const updated: QuestionnaireConfig = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.questionnaireConfigs.set(id, updated);
    return updated;
  }

  async findById(id: number): Promise<QuestionnaireConfig | undefined> {
    return tables.questionnaireConfigs.get(id);
  }

  async list(filter?: {
    productCategoryId?: number;
    brandId?: number | null;
    partnerId?: number | null;
    isActive?: boolean;
  }): Promise<QuestionnaireConfig[]> {
    let result = filter?.productCategoryId !== undefined
      ? getIndexed(indexes.questionnaireConfigsByCategory, filter.productCategoryId, tables.questionnaireConfigs)
      : Array.from(tables.questionnaireConfigs.values());
    if (filter?.brandId !== undefined) result = result.filter((c) => c.brandId === filter.brandId);
    if (filter?.partnerId !== undefined) result = result.filter((c) => c.partnerId === filter.partnerId);
    if (filter?.isActive !== undefined) result = result.filter((c) => c.isActive === filter.isActive);
    return result;
  }

  /**
   * Resolution precedence (most to least specific), all requiring an exact
   * Category match:
   *   1. brand exact    + partner exact
   *   2. brand wildcard  + partner exact   (partner beats brand when only one is specific)
   *   3. brand exact    + partner wildcard
   *   4. brand wildcard  + partner wildcard (generic fallback)
   * Tiers 1/2 are only attempted if a partnerId was actually provided, and
   * tiers 1/3 only if a brandId was provided - you can't match a "specific
   * X" tier without an X to match against. The FIRST tier (in that order)
   * with at least one config row wins; its rows all become the answer -
   * we never partially blend multiple tiers together. Each tier is a
   * single O(1) index lookup via the (category, brand, partner) composite
   * index, never a linear scan.
   */
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
    for (const tier of tiers) {
      const rows = getIndexed(
        indexes.questionnaireConfigsByProfile,
        profileKey(productCategoryId, tier.brandId, tier.partnerId),
        tables.questionnaireConfigs,
      ).filter((c) => c.isActive);
      if (rows.length > 0) {
        matched = rows;
        break;
      }
    }
    if (matched.length === 0) return [];

    // Group the matched (question, answer) config rows back up by their
    // underlying question - a question with N answer options has N config
    // rows here, all sharing one `sequence` for that question's position.
    const grouped = new Map<number, { sequence: number; questionAnswerIds: number[] }>();
    for (const config of matched) {
      const questionId = this.questionIdFor(config.questionAnswerId);
      if (questionId === undefined) continue;
      const entry = grouped.get(questionId) ?? { sequence: config.sequence, questionAnswerIds: [] };
      entry.questionAnswerIds.push(config.questionAnswerId);
      grouped.set(questionId, entry);
    }

    const results: ResolvedQuestionnaireQuestion[] = [];
    for (const [questionId, { sequence, questionAnswerIds }] of grouped) {
      const question = tables.masterQuestions.get(questionId);
      if (!question || !question.isActive) continue;

      const questionText =
        findTranslatedText(
          getIndexed(indexes.questionTranslationsByQuestionId, questionId, tables.questionTranslations),
          language,
        ) ?? String(questionId);

      const answers: ResolvedQuestionnaireQuestion['answers'] = [];
      for (const qaId of questionAnswerIds) {
        const qam = tables.questionAnswerMappings.get(qaId);
        if (!qam || !qam.isActive) continue;
        const answer = tables.masterAnswers.get(qam.answerId);
        if (!answer || !answer.isActive) continue;
        const answerText =
          findTranslatedText(
            getIndexed(indexes.answerTranslationsByAnswerId, answer.id, tables.answerTranslations),
            language,
          ) ?? answer.code;
        answers.push({ questionAnswerId: qaId, answerId: answer.id, code: answer.code, text: answerText });
      }

      results.push({ questionId, type: question.type, sequence, text: questionText, answers });
    }

    results.sort((a, b) => a.sequence - b.sequence);
    return results;
  }

  private questionIdFor(questionAnswerId: number): number | undefined {
    return tables.questionAnswerMappings.get(questionAnswerId)?.questionId;
  }
}
