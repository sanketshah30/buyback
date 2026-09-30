import { Session } from '../../types/domain';
import { SessionRepository } from '../interfaces';
import { JsonDocStore, nowIso } from './jsonDocStore';

const store = new JsonDocStore<Session>('sessions');

export class PostgresSessionRepository implements SessionRepository {
  async create(session: Session): Promise<Session> {
    return store.insert(session);
  }

  async findByToken(token: string): Promise<Session | undefined> {
    return store.findByJsonText('token', token);
  }

  async revoke(token: string): Promise<void> {
    const session = await this.findByToken(token);
    if (session && !session.revokedAt) {
      const now = nowIso();
      await store.replace(session.id, { ...session, revokedAt: now, updatedAt: now });
    }
  }

  async listByUser(userId: number): Promise<Session[]> {
    const rows = await store.findByJsonInt('userId', userId);
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}
