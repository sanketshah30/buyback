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

  async create(mobile: string): Promise<User> {
    const user: User = { id: uuid(), mobile, createdAt: new Date().toISOString() };
    tables.users.set(user.id, user);
    tables.usersByMobile.set(mobile, user.id);
    return user;
  }
}
