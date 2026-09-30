import { Role } from '../../types/domain';
import { RoleRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<Role>('roles');

export class PostgresRoleRepository implements RoleRepository {
  async create(role: Role): Promise<Role> {
    return store.insert(role);
  }

  async update(id: number, patch: Partial<Role>): Promise<Role> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Role', id);
    const updated: Role = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<Role | undefined> {
    return store.get(id);
  }

  async list(filter?: { isActive?: boolean }): Promise<Role[]> {
    let result = await store.listAll();
    if (filter?.isActive !== undefined) result = result.filter((r) => r.isActive === filter.isActive);
    return result;
  }
}
