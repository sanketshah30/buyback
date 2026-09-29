import { MasterAnswer } from '../../types/domain';
import { MasterAnswerRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryMasterAnswerRepository implements MasterAnswerRepository {
  async create(answer: MasterAnswer): Promise<MasterAnswer> {
    tables.masterAnswers.set(answer.id, answer);
    return answer;
  }

  async update(id: number, patch: Partial<MasterAnswer>): Promise<MasterAnswer> {
    const existing = tables.masterAnswers.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Answer ${id} not found`), { status: 404 });
    }
    const updated: MasterAnswer = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.masterAnswers.set(id, updated);
    return updated;
  }

  async findById(id: number): Promise<MasterAnswer | undefined> {
    return tables.masterAnswers.get(id);
  }

  async findByCode(code: string): Promise<MasterAnswer | undefined> {
    return Array.from(tables.masterAnswers.values()).find((a) => a.code === code);
  }

  async list(filter?: { isActive?: boolean }): Promise<MasterAnswer[]> {
    let result = Array.from(tables.masterAnswers.values());
    if (filter?.isActive !== undefined) result = result.filter((a) => a.isActive === filter.isActive);
    return result;
  }
}
