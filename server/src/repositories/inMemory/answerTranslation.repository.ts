import { AnswerTranslation } from '../../types/domain';
import { AnswerTranslationRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryAnswerTranslationRepository implements AnswerTranslationRepository {
  async upsert(translation: AnswerTranslation): Promise<AnswerTranslation> {
    const existing = await this.find(translation.answerId, translation.language);
    if (existing) {
      const updated: AnswerTranslation = { ...existing, text: translation.text, updatedAt: new Date().toISOString() };
      tables.answerTranslations.set(existing.id, updated);
      return updated;
    }
    tables.answerTranslations.set(translation.id, translation);
    return translation;
  }

  async listByAnswer(answerId: string): Promise<AnswerTranslation[]> {
    return Array.from(tables.answerTranslations.values()).filter((t) => t.answerId === answerId && t.isActive);
  }

  async find(answerId: string, language: string): Promise<AnswerTranslation | undefined> {
    return Array.from(tables.answerTranslations.values()).find(
      (t) => t.answerId === answerId && t.language === language && t.isActive,
    );
  }
}
