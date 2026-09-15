import { MasterQuestion } from '../../types/domain';
import { MasterQuestionRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryMasterQuestionRepository implements MasterQuestionRepository {
  async create(question: MasterQuestion): Promise<MasterQuestion> {
    tables.masterQuestions.set(question.id, question);
    return question;
  }

  async update(id: number, patch: Partial<MasterQuestion>): Promise<MasterQuestion> {
    const existing = tables.masterQuestions.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Question ${id} not found`), { status: 404 });
    }
    const updated: MasterQuestion = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.masterQuestions.set(id, updated);
    return updated;
  }

  async findById(id: number): Promise<MasterQuestion | undefined> {
    return tables.masterQuestions.get(id);
  }

  async list(filter?: { isActive?: boolean }): Promise<MasterQuestion[]> {
    let result = Array.from(tables.masterQuestions.values());
    if (filter?.isActive !== undefined) result = result.filter((q) => q.isActive === filter.isActive);
    return result;
  }
}
