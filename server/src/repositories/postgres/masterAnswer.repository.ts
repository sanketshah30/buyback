import { MasterAnswer } from '../../types/domain';
import { MasterAnswerRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<MasterAnswer>('master_answers');

export class PostgresMasterAnswerRepository implements MasterAnswerRepository {
  async create(answer: MasterAnswer): Promise<MasterAnswer> {
    return store.insert(answer);
  }

  async update(id: number, patch: Partial<MasterAnswer>): Promise<MasterAnswer> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Master answer', id);
    const updated: MasterAnswer = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<MasterAnswer | undefined> {
    return store.get(id);
  }

  async findByCode(code: string): Promise<MasterAnswer | undefined> {
    return store.findByJsonText('code', code);
  }

  async list(filter?: { isActive?: boolean }): Promise<MasterAnswer[]> {
    let result = await store.listAll();
    if (filter?.isActive !== undefined) result = result.filter((a) => a.isActive === filter.isActive);
    return result;
  }
}
