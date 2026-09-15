import { UserLocationHistory } from '../../types/domain';
import { UserLocationHistoryRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemoryUserLocationHistoryRepository implements UserLocationHistoryRepository {
  async record(entry: UserLocationHistory): Promise<UserLocationHistory> {
    tables.userLocationHistory.set(entry.id, entry);
    addToIndex(indexes.userLocationHistoryByUserId, entry.userId, entry.id);
    return entry;
  }

  async listByUser(userId: number): Promise<UserLocationHistory[]> {
    return getIndexed(indexes.userLocationHistoryByUserId, userId, tables.userLocationHistory).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
  }
}
