import { QuestionAnswerMapping } from '../../types/domain';
import { QuestionAnswerMappingRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<QuestionAnswerMapping>('question_answer_mappings');

export class PostgresQuestionAnswerMappingRepository implements QuestionAnswerMappingRepository {
  async create(mapping: QuestionAnswerMapping): Promise<QuestionAnswerMapping> {
    return store.insert(mapping);
  }

  async update(id: number, patch: Partial<QuestionAnswerMapping>): Promise<QuestionAnswerMapping> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Question answer mapping', id);
    const updated: QuestionAnswerMapping = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<QuestionAnswerMapping | undefined> {
    return store.get(id);
  }

  async listByQuestion(questionId: number): Promise<QuestionAnswerMapping[]> {
    return (await store.findByJsonInt('questionId', questionId)).filter((m) => m.isActive);
  }

  async list(filter?: { isActive?: boolean }): Promise<QuestionAnswerMapping[]> {
    let result = await store.listAll();
    if (filter?.isActive !== undefined) result = result.filter((m) => m.isActive === filter.isActive);
    return result;
  }
}
