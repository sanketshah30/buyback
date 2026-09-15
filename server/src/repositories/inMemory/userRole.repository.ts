import { v4 as uuid } from 'uuid';
import { UserRole } from '../../types/domain';
import { UserRoleRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryUserRoleRepository implements UserRoleRepository {
  async assign(userRole: UserRole): Promise<UserRole> {
    const record: UserRole = userRole.id ? userRole : { ...userRole, id: uuid() };
    tables.userRoles.set(record.id, record);
    return record;
  }

  async revoke(userId: string, roleId: string): Promise<void> {
    const match = Array.from(tables.userRoles.values()).find(
      (ur) => ur.userId === userId && ur.roleId === roleId && ur.isActive,
    );
    if (match) {
      tables.userRoles.set(match.id, { ...match, isActive: false, updatedAt: new Date().toISOString() });
    }
  }

  async listByUser(userId: string): Promise<UserRole[]> {
    return Array.from(tables.userRoles.values()).filter((ur) => ur.userId === userId && ur.isActive);
  }

  async findActive(userId: string, roleId: string): Promise<UserRole | undefined> {
    return Array.from(tables.userRoles.values()).find(
      (ur) => ur.userId === userId && ur.roleId === roleId && ur.isActive,
    );
  }
}
