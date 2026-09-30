import { RequestStatusMaster } from '../../types/domain';
import { RequestStatusMasterRepository } from '../interfaces';
import { JsonDocStore } from './jsonDocStore';

const store = new JsonDocStore<RequestStatusMaster>('request_status_master');

export class PostgresRequestStatusMasterRepository implements RequestStatusMasterRepository {
  async list(filter?: { isActive?: boolean }): Promise<RequestStatusMaster[]> {
    let result = await store.listAll();
    if (filter?.isActive !== undefined) result = result.filter((s) => s.isActive === filter.isActive);
    return result.sort((a, b) => a.sequence - b.sequence);
  }

  async findById(id: number): Promise<RequestStatusMaster | undefined> {
    return store.get(id);
  }

  async findByName(name: string): Promise<RequestStatusMaster | undefined> {
    return store.findByJsonText('name', name);
  }
}
