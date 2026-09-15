import { BuybackRequest } from '../../types/domain';
import { BuybackRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemoryBuybackRepository implements BuybackRepository {
  async create(request: BuybackRequest): Promise<BuybackRequest> {
    tables.buybackRequests.set(request.id, request);
    addToIndex(indexes.buybackRequestsByUserId, request.userId, request.id);
    return request;
  }

  async findById(id: number): Promise<BuybackRequest | undefined> {
    return tables.buybackRequests.get(id);
  }

  async update(id: number, patch: Partial<BuybackRequest>): Promise<BuybackRequest> {
    const existing = tables.buybackRequests.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Buyback request ${id} not found`), { status: 404 });
    }
    const updated: BuybackRequest = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    tables.buybackRequests.set(id, updated);
    return updated;
  }

  async listByUser(userId: number): Promise<BuybackRequest[]> {
    return getIndexed(indexes.buybackRequestsByUserId, userId, tables.buybackRequests).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
  }

  async nextDailySequence(dateKey: string): Promise<number> {
    const current = tables.dailySequences.get(dateKey) ?? 0;
    const next = current + 1;
    tables.dailySequences.set(dateKey, next);
    return next;
  }
}
