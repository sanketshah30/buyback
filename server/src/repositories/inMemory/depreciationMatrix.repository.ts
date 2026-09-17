import { DepreciationMatrixEntry } from '../../types/domain';
import { DepreciationMatrixRepository } from '../interfaces';
import { indexes, tables } from './db';
import { addToIndex, getIndexed, removeFromIndex } from './indexUtils';

export class InMemoryDepreciationMatrixRepository implements DepreciationMatrixRepository {
  async create(entry: DepreciationMatrixEntry): Promise<DepreciationMatrixEntry> {
    tables.depreciationMatrix.set(entry.id, entry);
    addToIndex(indexes.depreciationMatrixByConfigId, entry.depreciationConfigId, entry.id);
    addToIndex(indexes.depreciationMatrixByQuestionAnswerId, entry.questionAnswerId, entry.id);
    return entry;
  }

  async update(id: number, patch: Partial<DepreciationMatrixEntry>): Promise<DepreciationMatrixEntry> {
    const existing = tables.depreciationMatrix.get(id);
    if (!existing) {
      throw Object.assign(new Error(`Depreciation matrix entry ${id} not found`), { status: 404 });
    }
    const updated: DepreciationMatrixEntry = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    tables.depreciationMatrix.set(id, updated);

    if (patch.depreciationConfigId !== undefined && patch.depreciationConfigId !== existing.depreciationConfigId) {
      removeFromIndex(indexes.depreciationMatrixByConfigId, existing.depreciationConfigId, id);
      addToIndex(indexes.depreciationMatrixByConfigId, updated.depreciationConfigId, id);
    }
    if (patch.questionAnswerId !== undefined && patch.questionAnswerId !== existing.questionAnswerId) {
      removeFromIndex(indexes.depreciationMatrixByQuestionAnswerId, existing.questionAnswerId, id);
      addToIndex(indexes.depreciationMatrixByQuestionAnswerId, updated.questionAnswerId, id);
    }
    return updated;
  }

  async findById(id: number): Promise<DepreciationMatrixEntry | undefined> {
    return tables.depreciationMatrix.get(id);
  }

  async list(filter?: {
    depreciationConfigId?: number;
    questionAnswerId?: number;
    isActive?: boolean;
  }): Promise<DepreciationMatrixEntry[]> {
    let result: DepreciationMatrixEntry[];
    if (filter?.depreciationConfigId !== undefined) {
      result = getIndexed(indexes.depreciationMatrixByConfigId, filter.depreciationConfigId, tables.depreciationMatrix);
    } else if (filter?.questionAnswerId !== undefined) {
      result = getIndexed(indexes.depreciationMatrixByQuestionAnswerId, filter.questionAnswerId, tables.depreciationMatrix);
    } else {
      result = Array.from(tables.depreciationMatrix.values());
    }
    if (filter?.questionAnswerId !== undefined) result = result.filter((m) => m.questionAnswerId === filter.questionAnswerId);
    if (filter?.isActive !== undefined) result = result.filter((m) => m.isActive === filter.isActive);
    return result;
  }

  async listByConfig(depreciationConfigId: number): Promise<DepreciationMatrixEntry[]> {
    return getIndexed(indexes.depreciationMatrixByConfigId, depreciationConfigId, tables.depreciationMatrix).filter((m) => m.isActive);
  }
}
