import { QuestionTranslation } from '../../types/domain';
import { allocateId } from '../../utils/idGenerator';
import { QuestionTranslationRepository } from '../interfaces';
import { JsonDocStore, nowIso } from './jsonDocStore';

const store = new JsonDocStore<QuestionTranslation>('question_translations');

export class PostgresQuestionTranslationRepository implements QuestionTranslationRepository {
  async upsert(translation: QuestionTranslation): Promise<QuestionTranslation> {
    const existing = await this.find(translation.questionId, translation.language);
    if (existing) {
      const updated: QuestionTranslation = {
        ...existing,
        text: translation.text,
        updatedAt: nowIso(),
      };
      return store.replace(existing.id, updated);
    }
    const record: QuestionTranslation = translation.id
      ? translation
      : { ...translation, id: await allocateId('question_translations') };
    return store.insert(record);
  }

  async listByQuestion(questionId: number): Promise<QuestionTranslation[]> {
    return (await store.findByJsonInt('questionId', questionId)).filter((t) => t.isActive);
  }

  async find(questionId: number, language: string): Promise<QuestionTranslation | undefined> {
    return (await store.findByJsonInt('questionId', questionId)).find(
      (t) => t.language === language && t.isActive,
    );
  }
}
