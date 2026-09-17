import { RequestStatusMaster } from '../../types/domain';
import { RequestStatusMasterRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryRequestStatusMasterRepository implements RequestStatusMasterRepository {
  async list(filter?: { isActive?: boolean }): Promise<RequestStatusMaster[]> {
    let result = Array.from(tables.requestStatusMaster.values()).sort((a, b) => a.sequence - b.sequence);
    if (filter?.isActive !== undefined) result = result.filter((s) => s.isActive === filter.isActive);
    return result;
  }

  async findById(id: number): Promise<RequestStatusMaster | undefined> {
    return tables.requestStatusMaster.get(id);
  }

  async findByName(name: string): Promise<RequestStatusMaster | undefined> {
    return Array.from(tables.requestStatusMaster.values()).find((s) => s.name === name);
  }
}
