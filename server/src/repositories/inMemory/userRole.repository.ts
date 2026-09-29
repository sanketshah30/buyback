import { UserRole } from '../../types/domain';
import { nextId } from '../../utils/idGenerator';
import { UserRoleRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed } from './indexUtils';

export class InMemoryUserRoleRepository implements UserRoleRepository {
  async assign(userRole: UserRole): Promise<UserRole> {
    const record: UserRole = userRole.id ? userRole : { ...userRole, id: nextId('user_roles') };
    tables.userRoles.set(record.id, record);
    addToIndex(indexes.userRolesByUserId, record.userId, record.id);
    return record;
  }

  async revoke(userId: number, roleId: number): Promise<void> {
    const match = getIndexed(indexes.userRolesByUserId, userId, tables.userRoles).find(
      (ur) => ur.roleId === roleId && ur.isActive,
    );
    if (match) {
      tables.userRoles.set(match.id, { ...match, isActive: false, updatedAt: new Date().toISOString() });
    }
  }

  async listByUser(userId: number): Promise<UserRole[]> {
    return getIndexed(indexes.userRolesByUserId, userId, tables.userRoles).filter((ur) => ur.isActive);
  }

  async findActive(userId: number, roleId: number): Promise<UserRole | undefined> {
    return getIndexed(indexes.userRolesByUserId, userId, tables.userRoles).find(
      (ur) => ur.roleId === roleId && ur.isActive,
    );
  }
}
