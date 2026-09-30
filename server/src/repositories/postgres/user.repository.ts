import { User } from '../../types/domain';
import { allocateId } from '../../utils/idGenerator';
import { UserRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<User>('users');

export class PostgresUserRepository implements UserRepository {
  async findByMobile(mobile: string): Promise<User | undefined> {
    return store.findByJsonText('mobile', mobile);
  }

  async findById(id: number): Promise<User | undefined> {
    return store.get(id);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return store.findByJsonText('username', username);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return store.findByJsonText('email', email);
  }

  async create(
    mobile: string,
    extra?: Partial<Pick<User, 'username' | 'email' | 'name' | 'partnerLocationId'>>,
  ): Promise<User> {
    const now = nowIso();
    const user: User = {
      id: await allocateId('users'),
      mobile,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ...extra,
    };
    return store.insert(user);
  }

  async update(id: number, patch: Partial<User>): Promise<User> {
    const existing = await store.get(id);
    if (!existing) throw notFound('User', id);
    const updated: User = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async listByLocation(partnerLocationId: number): Promise<User[]> {
    const rows = await store.findByJsonInt('partnerLocationId', partnerLocationId);
    return rows.filter((u) => u.isActive);
  }

  async list(filter?: { isActive?: boolean }): Promise<User[]> {
    let users = await store.listAll();
    if (filter?.isActive !== undefined) {
      users = users.filter((u) => u.isActive === filter.isActive);
    }
    return users;
  }
}
