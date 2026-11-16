import { getSql } from '../../db/postgres';
import { DepreciationMatrixEntry } from '../../types/domain';
import { DepreciationMatrixRepository } from '../interfaces';
import { EntityTable, SqlRow, baseEntityColumns, mapBaseEntity, toNum } from './helpers';

const matrix = new EntityTable<DepreciationMatrixEntry>(
  'depreciation_matrix',
  'Depreciation matrix entry',
  (row) => ({
    ...mapBaseEntity(row),
    depreciationConfigId: toNum(row.depreciation_config_id),
    questionAnswerId: toNum(row.question_answer_id),
    depreciationType: row.depreciation_type as DepreciationMatrixEntry['depreciationType'],
    depreciationValue: toNum(row.depreciation_value),
  }),
  (e) => ({
    ...baseEntityColumns(e),
    depreciation_config_id: e.depreciationConfigId,
    question_answer_id: e.questionAnswerId,
    depreciation_type: e.depreciationType,
    depreciation_value: e.depreciationValue,
  }),
);

export class PostgresDepreciationMatrixRepository implements DepreciationMatrixRepository {
  async create(entry: DepreciationMatrixEntry): Promise<DepreciationMatrixEntry> {
    return matrix.insert(entry);
  }

  async update(id: number, patch: Partial<DepreciationMatrixEntry>): Promise<DepreciationMatrixEntry> {
    return matrix.update(id, patch);
  }

  async findById(id: number): Promise<DepreciationMatrixEntry | undefined> {
    return matrix.get(id);
  }

  async list(filter?: {
    depreciationConfigId?: number;
    questionAnswerId?: number;
    isActive?: boolean;
  }): Promise<DepreciationMatrixEntry[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM depreciation_matrix
      WHERE true
      ${
        filter?.depreciationConfigId !== undefined
          ? sql`AND depreciation_config_id = ${filter.depreciationConfigId}`
          : sql``
      }
      ${filter?.questionAnswerId !== undefined ? sql`AND question_answer_id = ${filter.questionAnswerId}` : sql``}
      ${filter?.isActive !== undefined ? sql`AND is_active = ${filter.isActive}` : sql``}
      ORDER BY id
    `;
    return matrix.mapRows(rows);
  }

  async listByConfig(depreciationConfigId: number): Promise<DepreciationMatrixEntry[]> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      SELECT * FROM depreciation_matrix
      WHERE depreciation_config_id = ${depreciationConfigId} AND is_active = true
      ORDER BY id
    `;
    return matrix.mapRows(rows);
  }
}
