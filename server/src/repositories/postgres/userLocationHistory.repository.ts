import { UserLocationHistory } from '../../types/domain';
import { UserLocationHistoryRepository } from '../interfaces';
import { JsonDocStore } from './jsonDocStore';

const store = new JsonDocStore<UserLocationHistory>('user_location_history');

export class PostgresUserLocationHistoryRepository implements UserLocationHistoryRepository {
  async record(entry: UserLocationHistory): Promise<UserLocationHistory> {
    return store.insert(entry);
  }

  async listByUser(userId: number): Promise<UserLocationHistory[]> {
    const rows = await store.findByJsonInt('userId', userId);
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}
