import { DepreciationMatrixEntry } from '../../types/domain';
import { DepreciationMatrixRepository } from '../interfaces';
import { JsonDocStore, nowIso, notFound } from './jsonDocStore';

const store = new JsonDocStore<DepreciationMatrixEntry>('depreciation_matrix');

export class PostgresDepreciationMatrixRepository implements DepreciationMatrixRepository {
  async create(entry: DepreciationMatrixEntry): Promise<DepreciationMatrixEntry> {
    return store.insert(entry);
  }

  async update(id: number, patch: Partial<DepreciationMatrixEntry>): Promise<DepreciationMatrixEntry> {
    const existing = await store.get(id);
    if (!existing) throw notFound('Depreciation matrix entry', id);
    const updated: DepreciationMatrixEntry = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
    return store.replace(id, updated);
  }

  async findById(id: number): Promise<DepreciationMatrixEntry | undefined> {
    return store.get(id);
  }

  async list(filter?: {
    depreciationConfigId?: number;
    questionAnswerId?: number;
    isActive?: boolean;
  }): Promise<DepreciationMatrixEntry[]> {
    let result: DepreciationMatrixEntry[];
    if (filter?.depreciationConfigId !== undefined) {
      result = await store.findByJsonInt('depreciationConfigId', filter.depreciationConfigId);
    } else if (filter?.questionAnswerId !== undefined) {
      result = await store.findByJsonInt('questionAnswerId', filter.questionAnswerId);
    } else {
      result = await store.listAll();
    }
    if (filter?.questionAnswerId !== undefined) {
      result = result.filter((e) => e.questionAnswerId === filter.questionAnswerId);
    }
    if (filter?.isActive !== undefined) result = result.filter((e) => e.isActive === filter.isActive);
    return result;
  }

  async listByConfig(depreciationConfigId: number): Promise<DepreciationMatrixEntry[]> {
    return (await store.findByJsonInt('depreciationConfigId', depreciationConfigId)).filter((e) => e.isActive);
  }
}
