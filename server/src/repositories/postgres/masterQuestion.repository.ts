import { MasterQuestion } from '../../types/domain';
import { MasterQuestionRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<MasterQuestion>('master_questions');

export class PostgresMasterQuestionRepository implements MasterQuestionRepository {
  async create(question: MasterQuestion): Promise<MasterQuestion> {
    return store.insert(question);
  }

  async update(id: number, patch: Partial<MasterQuestion>): Promise<MasterQuestion> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Master question', id);
    const updated: MasterQuestion = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<MasterQuestion | undefined> {
    return store.get(id);
  }

  async list(filter?: { isActive?: boolean }): Promise<MasterQuestion[]> {
    let result = await store.listAll();
    if (filter?.isActive !== undefined) result = result.filter((q) => q.isActive === filter.isActive);
    return result;
  }
}
