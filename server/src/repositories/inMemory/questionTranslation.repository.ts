import { QuestionTranslation } from '../../types/domain';
import { QuestionTranslationRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryQuestionTranslationRepository implements QuestionTranslationRepository {
  async upsert(translation: QuestionTranslation): Promise<QuestionTranslation> {
    const existing = await this.find(translation.questionId, translation.language);
    if (existing) {
      const updated: QuestionTranslation = { ...existing, text: translation.text, updatedAt: new Date().toISOString() };
      tables.questionTranslations.set(existing.id, updated);
      return updated;
    }
    tables.questionTranslations.set(translation.id, translation);
    return translation;
  }

  async listByQuestion(questionId: string): Promise<QuestionTranslation[]> {
    return Array.from(tables.questionTranslations.values()).filter((t) => t.questionId === questionId && t.isActive);
  }

  async find(questionId: string, language: string): Promise<QuestionTranslation | undefined> {
    return Array.from(tables.questionTranslations.values()).find(
      (t) => t.questionId === questionId && t.language === language && t.isActive,
    );
  }
}
