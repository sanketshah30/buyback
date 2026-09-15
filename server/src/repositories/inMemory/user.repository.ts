import { v4 as uuid } from 'uuid';
import { User } from '../../types/domain';
import { UserRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryUserRepository implements UserRepository {
  async findByMobile(mobile: string): Promise<User | undefined> {
    const id = tables.usersByMobile.get(mobile);
    return id ? tables.users.get(id) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
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
      id: uuid(),
      mobile,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      ...extra,
    };
    tables.users.set(user.id, user);
    tables.usersByMobile.set(mobile, user.id);
    return user;
  }

  async update(id: string, patch: Partial<User>): Promise<User> {
    const existing = tables.users.get(id);
    if (!existing) {
      throw Object.assign(new Error(`User ${id} not found`), { status: 404 });
    }
    const updated: User = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    tables.users.set(id, updated);
    if (patch.mobile && patch.mobile !== existing.mobile) {
      tables.usersByMobile.delete(existing.mobile);
      tables.usersByMobile.set(patch.mobile, id);
    }
    return updated;
  }

  async listByLocation(partnerLocationId: string): Promise<User[]> {
    return Array.from(tables.users.values()).filter((u) => u.partnerLocationId === partnerLocationId && u.isActive);
  }

  async list(filter?: { isActive?: boolean }): Promise<User[]> {
    let users = Array.from(tables.users.values());
    if (filter?.isActive !== undefined) {
      users = users.filter((u) => u.isActive === filter.isActive);
    }
    return users;
  }
}
