import { User } from '../../types/domain';
import { nextId } from '../../utils/idGenerator';
import { UserRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

export class InMemoryUserRepository implements UserRepository {
  async findByMobile(mobile: string): Promise<User | undefined> {
    const id = indexes.usersByMobile.get(mobile);
    return id !== undefined ? tables.users.get(id) : undefined;
  }

  async findById(id: number): Promise<User | undefined> {
    return tables.users.get(id);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return Array.from(tables.users.values()).find((u) => u.username === username);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return Array.from(tables.users.values()).find((u) => u.email === email);
  }

  async create(
    mobile: string,
    extra?: Partial<Pick<User, 'username' | 'email' | 'name' | 'partnerLocationId'>>,
  ): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: nextId('users'),
      mobile,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ...extra,
    };
    tables.users.set(user.id, user);
    indexes.usersByMobile.set(mobile, user.id);
    if (user.partnerLocationId !== undefined) {
      addToIndex(indexes.usersByPartnerLocationId, user.partnerLocationId, user.id);
    }
    return user;
  }

  async update(id: number, patch: Partial<User>): Promise<User> {
    const existing = tables.users.get(id);
    if (!existing) {
      throw Object.assign(new Error(`User ${id} not found`), { status: 404 });
    }
    const updated: User = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.users.set(id, updated);

    if (patch.mobile && patch.mobile !== existing.mobile) {
      indexes.usersByMobile.delete(existing.mobile);
      indexes.usersByMobile.set(patch.mobile, id);
    }
    if ('partnerLocationId' in patch && patch.partnerLocationId !== existing.partnerLocationId) {
      if (existing.partnerLocationId !== undefined) removeFromIndex(indexes.usersByPartnerLocationId, existing.partnerLocationId, id);
      if (updated.partnerLocationId !== undefined) addToIndex(indexes.usersByPartnerLocationId, updated.partnerLocationId, id);
    }
    return updated;
  }

  async listByLocation(partnerLocationId: number): Promise<User[]> {
    return getIndexed(indexes.usersByPartnerLocationId, partnerLocationId, tables.users).filter((u) => u.isActive);
  }

  async list(filter?: { isActive?: boolean }): Promise<User[]> {
    let users = Array.from(tables.users.values());
    if (filter?.isActive !== undefined) {
      users = users.filter((u) => u.isActive === filter.isActive);
    }
    return users;
  }
}
