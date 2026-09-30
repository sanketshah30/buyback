import { getSql } from '../../db/postgres';
import { BuybackRequest } from '../../types/domain';
import { BuybackRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<BuybackRequest>('buyback_requests');

export class PostgresBuybackRepository implements BuybackRepository {
  async create(request: BuybackRequest): Promise<BuybackRequest> {
    return store.insert(request);
  }

  async findById(id: number): Promise<BuybackRequest | undefined> {
    return store.get(id);
  }

  async update(id: number, patch: Partial<BuybackRequest>): Promise<BuybackRequest> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Buyback request', id);
    const updated: BuybackRequest = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: nowIso(),
    };
    return store.replace(id, updated);
  }

  async listByUser(userId: number): Promise<BuybackRequest[]> {
    const rows = await store.findByJsonInt('userId', userId);
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async nextDailySequence(dateKey: string): Promise<number> {
    const sql = getSql();
    const rows = await sql<{ last_value: string | number }[]>`
      INSERT INTO buyback_daily_sequences (date_key, last_value)
      VALUES (${dateKey}, 1)
      ON CONFLICT (date_key) DO UPDATE
        SET last_value = buyback_daily_sequences.last_value + 1
      RETURNING last_value
    `;
    return Number(rows[0].last_value);
  }
}
