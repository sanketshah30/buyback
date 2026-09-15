import { Session } from '../../types/domain';
import { SessionRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemorySessionRepository implements SessionRepository {
  async create(session: Session): Promise<Session> {
    tables.sessions.set(session.id, session);
    indexes.sessionsByToken.set(session.token, session.id);
    addToIndex(indexes.sessionsByUserId, session.userId, session.id);
    return session;
  }

  async findByToken(token: string): Promise<Session | undefined> {
    const id = indexes.sessionsByToken.get(token);
    return id !== undefined ? tables.sessions.get(id) : undefined;
  }

  async revoke(token: string): Promise<void> {
    const session = await this.findByToken(token);
    if (session && !session.revokedAt) {
      tables.sessions.set(session.id, { ...session, revokedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  }

  async listByUser(userId: number): Promise<Session[]> {
    return getIndexed(indexes.sessionsByUserId, userId, tables.sessions).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}
