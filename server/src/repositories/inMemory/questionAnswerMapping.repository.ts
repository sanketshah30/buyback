import { QuestionAnswerMapping } from '../../types/domain';
import { QuestionAnswerMappingRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemoryQuestionAnswerMappingRepository implements QuestionAnswerMappingRepository {
  async create(mapping: QuestionAnswerMapping): Promise<QuestionAnswerMapping> {
    tables.questionAnswerMappings.set(mapping.id, mapping);
    addToIndex(indexes.questionAnswerMappingsByQuestionId, mapping.questionId, mapping.id);
    return mapping;
  }

  async update(id: number, patch: Partial<QuestionAnswerMapping>): Promise<QuestionAnswerMapping> {
    const existing = tables.questionAnswerMappings.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Question-answer mapping ${id} not found`), { status: 404 });
    }
    const updated: QuestionAnswerMapping = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.questionAnswerMappings.set(id, updated);
    return updated;
  }

  async findById(id: number): Promise<QuestionAnswerMapping | undefined> {
    return tables.questionAnswerMappings.get(id);
  }

  async listByQuestion(questionId: number): Promise<QuestionAnswerMapping[]> {
    return getIndexed(indexes.questionAnswerMappingsByQuestionId, questionId, tables.questionAnswerMappings).filter((m) => m.isActive);
  }

  async list(filter?: { isActive?: boolean }): Promise<QuestionAnswerMapping[]> {
    let result = Array.from(tables.questionAnswerMappings.values());
    if (filter?.isActive !== undefined) result = result.filter((m) => m.isActive === filter.isActive);
    return result;
  }
}
