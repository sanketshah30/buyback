import { AnswerTranslation } from '../../types/domain';
import { allocateId } from '../../utils/idGenerator';
import { AnswerTranslationRepository } from '../interfaces';
import { JsonDocStore, nowIso } from './jsonDocStore';

const store = new JsonDocStore<AnswerTranslation>('answer_translations');

export class PostgresAnswerTranslationRepository implements AnswerTranslationRepository {
  async upsert(translation: AnswerTranslation): Promise<AnswerTranslation> {
    const existing = await this.find(translation.answerId, translation.language);
    if (existing) {
      const updated: AnswerTranslation = {
        ...existing,
        text: translation.text,
        updatedAt: nowIso(),
      };
      return store.replace(existing.id, updated);
    }
    const record: AnswerTranslation = translation.id
      ? translation
      : { ...translation, id: await allocateId('answer_translations') };
    return store.insert(record);
  }

  async listByAnswer(answerId: number): Promise<AnswerTranslation[]> {
    return (await store.findByJsonInt('answerId', answerId)).filter((t) => t.isActive);
  }

  async find(answerId: number, language: string): Promise<AnswerTranslation | undefined> {
    return (await store.findByJsonInt('answerId', answerId)).find(
      (t) => t.language === language && t.isActive,
    );
  }
}
