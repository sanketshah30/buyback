import { UserLocationHistory } from '../../types/domain';
import { UserLocationHistoryRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryUserLocationHistoryRepository implements UserLocationHistoryRepository {
  async record(entry: UserLocationHistory): Promise<UserLocationHistory> {
    tables.userLocationHistory.set(entry.id, entry);
    return entry;
  }

  async listByUser(userId: string): Promise<UserLocationHistory[]> {
    return Array.from(tables.userLocationHistory.values())
      .filter((h) => h.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}
