import { depreciationConfigRepository, depreciationMatrixRepository, questionAnswerMappingRepository } from '../repositories';
import { DepreciationConfig, DepreciationMatrixEntry } from '../types/domain';
import { nextId } from '../utils/idGenerator';

export interface DepreciationEntryInput {
  questionAnswerId: number;
  depreciationType: 'percentage' | 'absolute';
  depreciationValue: number;
}

export interface DepreciationUploadResult {
  config: DepreciationConfig;
  matrix: DepreciationMatrixEntry[];
  /** The previous open set for this exact (category, brand, vendor) triple, if this upload just superseded it. */
  supersededConfigId?: number;
}

function validateEntries(entries: DepreciationEntryInput[]): void {
  if (!entries.length) {
    throw Object.assign(new Error('entries must contain at least one question-answer deduction'), { status: 400 });
  }
  const seen = new Set<number>();
  for (const entry of entries) {
    if (!Number.isInteger(entry.questionAnswerId) || entry.questionAnswerId <= 0) {
      throw Object.assign(new Error('Each entry requires a valid integer questionAnswerId'), { status: 400 });
    }
    if (seen.has(entry.questionAnswerId)) {
      // questionAnswerId is unique per config set - see the DepreciationMatrixEntry doc comment in types/domain.ts.
      throw Object.assign(
        new Error(`questionAnswerId ${entry.questionAnswerId} appears more than once in this upload - it must be unique within a set`),
        { status: 400 },
      );
    }
    seen.add(entry.questionAnswerId);
    if (entry.depreciationType !== 'percentage' && entry.depreciationType !== 'absolute') {
      throw Object.assign(
        new Error(`depreciationType must be "percentage" or "absolute" (questionAnswerId ${entry.questionAnswerId})`),
        { status: 400 },
      );
    }
    if (typeof entry.depreciationValue !== 'number' || Number.isNaN(entry.depreciationValue) || entry.depreciationValue < 0) {
      throw Object.assign(
        new Error(`depreciationValue must be a non-negative number (questionAnswerId ${entry.questionAnswerId})`),
        { status: 400 },
      );
    }
    if (entry.depreciationType === 'percentage' && entry.depreciationValue > 100) {
      throw Object.assign(
        new Error(`depreciationValue for a "percentage" entry cannot exceed 100 (questionAnswerId ${entry.questionAnswerId})`),
        { status: 400 },
      );
    }
  }
}

export const depreciationService = {
  /**
   * "Upload" a full depreciation set for one (category, brand, vendor?)
   * combination - the whole point of splitting `depreciation_config`
   * (header) from `depreciation_matrix` (one lean row per question-answer)
   * is that this is exactly how configuration actually arrives: a whole
   * batch (e.g. 40 questions x a brand) at once, not row by row.
   *
   * Re-uploading the *exact same* (productCategoryId, brandId, vendorId)
   * triple doesn't fail or duplicate - it **versions** the existing set:
   * the currently-open row (`validTo` blank) has its `validTo` set to this
   * upload's timestamp, and a new row starts at that same timestamp with
   * `validTo` blank. History is preserved rather than overwritten.
   */
  async upload(
    productCategoryId: number,
    brandId: number,
    vendorId: number | null,
    entries: DepreciationEntryInput[],
    uploadedById: number,
  ): Promise<DepreciationUploadResult> {
    validateEntries(entries);
    for (const entry of entries) {
      const mapping = await questionAnswerMappingRepository.findById(entry.questionAnswerId);
      if (!mapping) {
        throw Object.assign(new Error(`Unknown questionAnswerId ${entry.questionAnswerId}`), { status: 404 });
      }
    }

    const now = new Date().toISOString();
    const existing = await depreciationConfigRepository.findActive(productCategoryId, brandId, vendorId);
    if (existing) {
      await depreciationConfigRepository.update(existing.id, { validTo: now });
    }

    const config = await depreciationConfigRepository.create({
      id: nextId('depreciation_config'),
      productCategoryId,
      brandId,
      vendorId,
      validFrom: now,
      uploadedById,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });

    const matrix: DepreciationMatrixEntry[] = [];
    for (const entry of entries) {
      const row = await depreciationMatrixRepository.create({
        id: nextId('depreciation_matrix'),
        depreciationConfigId: config.id,
        questionAnswerId: entry.questionAnswerId,
        depreciationType: entry.depreciationType,
        depreciationValue: entry.depreciationValue,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      });
      matrix.push(row);
    }

    return { config, matrix, supersededConfigId: existing?.id };
  },

  /**
   * Resolves the single applicable depreciation set for a (category,
   * brand, vendor?, asOf?) scope: an exact vendor match wins if one is
   * currently valid, otherwise falls back to the wildcard (`vendorId:
   * null`) set. Returns the set together with its full matrix.
   *
   * How multiple *matrix rows within* that set eventually combine (e.g.
   * stack every matched question-answer's deduction) is the calculation
   * engine's job, deferred for now - this only resolves which single
   * config set applies.
   */
  async resolve(
    productCategoryId: number,
    brandId: number,
    vendorId: number | undefined,
    asOf: Date = new Date(),
  ): Promise<{ config: DepreciationConfig; matrix: DepreciationMatrixEntry[] } | undefined> {
    const candidateVendorIds: (number | null)[] = vendorId !== undefined ? [vendorId, null] : [null];

    for (const candidateVendorId of candidateVendorIds) {
      const configs = await depreciationConfigRepository.list({ productCategoryId, brandId, vendorId: candidateVendorId, isActive: true });
      const validConfig = configs.find((c) => {
        const from = new Date(c.validFrom).getTime();
        const to = c.validTo ? new Date(c.validTo).getTime() : undefined;
        return from <= asOf.getTime() && (to === undefined || asOf.getTime() < to);
      });
      if (validConfig) {
        const matrix = await depreciationMatrixRepository.listByConfig(validConfig.id);
        return { config: validConfig, matrix };
      }
    }
    return undefined;
  },
};
