import { BuybackRequest } from '../../types/domain';
import { BuybackRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryBuybackRepository implements BuybackRepository {
  async create(request: BuybackRequest): Promise<BuybackRequest> {
    tables.buybackRequests.set(request.id, request);
    return request;
  }

  async findById(id: string): Promise<BuybackRequest | undefined> {
    return tables.buybackRequests.get(id);
  }

  async update(id: string, patch: Partial<BuybackRequest>): Promise<BuybackRequest> {
    const existing = tables.buybackRequests.get(id);
    if (!existing) {
      throw new Error(`Buyback request ${id} not found`);
    }
    const updated: BuybackRequest = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    tables.buybackRequests.set(id, updated);
    return updated;
  }

  async listByUser(userId: string): Promise<BuybackRequest[]> {
    return Array.from(tables.buybackRequests.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async nextDailySequence(dateKey: string): Promise<number> {
    const current = tables.dailySequences.get(dateKey) ?? 0;
    const next = current + 1;
    tables.dailySequences.set(dateKey, next);
    return next;
  }
}
