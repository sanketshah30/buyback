import { QuestionTranslation } from '../../types/domain';
import { nextId } from '../../utils/idGenerator';
import { QuestionTranslationRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemoryQuestionTranslationRepository implements QuestionTranslationRepository {
  async upsert(translation: QuestionTranslation): Promise<QuestionTranslation> {
    const existing = await this.find(translation.questionId, translation.language);
    if (existing) {
      const updated: QuestionTranslation = { ...existing, text: translation.text, updatedAt: new Date().toISOString() };
      tables.questionTranslations.set(existing.id, updated);
      return updated;
    }
    const record: QuestionTranslation = translation.id ? translation : { ...translation, id: nextId('question_translations') };
    tables.questionTranslations.set(record.id, record);
    addToIndex(indexes.questionTranslationsByQuestionId, record.questionId, record.id);
    return record;
  }

  async listByQuestion(questionId: number): Promise<QuestionTranslation[]> {
    return getIndexed(indexes.questionTranslationsByQuestionId, questionId, tables.questionTranslations).filter((t) => t.isActive);
  }

  async find(questionId: number, language: string): Promise<QuestionTranslation | undefined> {
    return getIndexed(indexes.questionTranslationsByQuestionId, questionId, tables.questionTranslations).find(
      (t) => t.language === language && t.isActive,
    );
  }
}
