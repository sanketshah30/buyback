import { AnswerTranslation } from '../../types/domain';
import { nextId } from '../../utils/idGenerator';
import { AnswerTranslationRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemoryAnswerTranslationRepository implements AnswerTranslationRepository {
  async upsert(translation: AnswerTranslation): Promise<AnswerTranslation> {
    const existing = await this.find(translation.answerId, translation.language);
    if (existing) {
      const updated: AnswerTranslation = { ...existing, text: translation.text, updatedAt: new Date().toISOString() };
      tables.answerTranslations.set(existing.id, updated);
      return updated;
    }
    const record: AnswerTranslation = translation.id ? translation : { ...translation, id: nextId('answer_translations') };
    tables.answerTranslations.set(record.id, record);
    addToIndex(indexes.answerTranslationsByAnswerId, record.answerId, record.id);
    return record;
  }

  async listByAnswer(answerId: number): Promise<AnswerTranslation[]> {
    return getIndexed(indexes.answerTranslationsByAnswerId, answerId, tables.answerTranslations).filter((t) => t.isActive);
  }

  async find(answerId: number, language: string): Promise<AnswerTranslation | undefined> {
    return getIndexed(indexes.answerTranslationsByAnswerId, answerId, tables.answerTranslations).find(
      (t) => t.language === language && t.isActive,
    );
  }
}
