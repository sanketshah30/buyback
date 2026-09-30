import { UserRole } from '../../types/domain';
import { allocateId } from '../../utils/idGenerator';
import { UserRoleRepository } from '../interfaces';
import { JsonDocStore, nowIso } from './jsonDocStore';

const store = new JsonDocStore<UserRole>('user_roles');

export class PostgresUserRoleRepository implements UserRoleRepository {
  async assign(userRole: UserRole): Promise<UserRole> {
    const record: UserRole = userRole.id ? userRole : { ...userRole, id: await allocateId('user_roles') };
    return store.insert(record);
  }

  async revoke(userId: number, roleId: number): Promise<void> {
    const active = await this.findActive(userId, roleId);
    if (!active) return;
    await store.replace(active.id, { ...active, isActive: false, updatedAt: nowIso() });
  }

  async listByUser(userId: number): Promise<UserRole[]> {
    return (await store.findByJsonInt('userId', userId)).filter((ur) => ur.isActive);
  }

  async findActive(userId: number, roleId: number): Promise<UserRole | undefined> {
    return (await store.findByJsonInt('userId', userId)).find((ur) => ur.roleId === roleId && ur.isActive);
  }
}
