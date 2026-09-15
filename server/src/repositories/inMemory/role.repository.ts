import { Role } from '../../types/domain';
import { RoleRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryRoleRepository implements RoleRepository {
  async create(role: Role): Promise<Role> {
    tables.roles.set(role.id, role);
    return role;
  }

  async update(id: string, patch: Partial<Role>): Promise<Role> {
    const existing = tables.roles.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Role ${id} not found`), { status: 404 });
    }
    const updated: Role = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.roles.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<Role | undefined> {
    return tables.roles.get(id);
  }

  async list(filter?: { isActive?: boolean }): Promise<Role[]> {
    let result = Array.from(tables.roles.values());
    if (filter?.isActive !== undefined) result = result.filter((r) => r.isActive === filter.isActive);
    return result;
  }
}
