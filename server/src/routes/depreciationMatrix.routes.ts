import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { depreciationConfigRepository, depreciationMatrixRepository, questionAnswerMappingRepository } from '../repositories';
import { DepreciationMatrixEntry } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const depreciationMatrixRouter = Router();
depreciationMatrixRouter.use(requireAuth);

const DEPRECIATION_TYPES = ['percentage', 'absolute'] as const;

// List/search is POST + body, never GET + query string - see server/README.md.
depreciationMatrixRouter.post('/search', async (req, res, next) => {
  try {
    const depreciationConfigId = req.body?.depreciationConfigId !== undefined ? parseId(req.body.depreciationConfigId) : undefined;
    const questionAnswerId = req.body?.questionAnswerId !== undefined ? parseId(req.body.questionAnswerId) : undefined;
    const { isActive } = req.body as { isActive?: boolean };
    const entries = await depreciationMatrixRepository.list({ depreciationConfigId, questionAnswerId, isActive });
    return res.json(entries);
  } catch (err) {
    return next(err);
  }
});

/**
 * Add a single new question-answer deduction to an *existing* config set,
 * without re-uploading (and thus re-versioning) the whole set. For
 * uploading/replacing a whole set at once, use `POST
 * /api/depreciation-config` instead.
 */
depreciationMatrixRouter.post('/', async (req, res, next) => {
  try {
    const depreciationConfigId = parseId(req.body?.depreciationConfigId);
    const questionAnswerId = parseId(req.body?.questionAnswerId);
    const { depreciationType, depreciationValue } = req.body as { depreciationType?: string; depreciationValue?: number };

    if (!depreciationConfigId || !questionAnswerId) {
      return res.status(400).json({ error: 'depreciationConfigId and questionAnswerId are required' });
    }
    if (!depreciationType || !DEPRECIATION_TYPES.includes(depreciationType as (typeof DEPRECIATION_TYPES)[number])) {
      return res.status(400).json({ error: `depreciationType must be one of: ${DEPRECIATION_TYPES.join(', ')}` });
    }
    if (typeof depreciationValue !== 'number' || Number.isNaN(depreciationValue) || depreciationValue < 0) {
      return res.status(400).json({ error: 'depreciationValue must be a non-negative number' });
    }
    if (depreciationType === 'percentage' && depreciationValue > 100) {
      return res.status(400).json({ error: 'depreciationValue for a "percentage" entry cannot exceed 100' });
    }

    const config = await depreciationConfigRepository.findById(depreciationConfigId);
    if (!config) return res.status(404).json({ error: 'Unknown depreciationConfigId' });
    const mapping = await questionAnswerMappingRepository.findById(questionAnswerId);
    if (!mapping) return res.status(404).json({ error: 'Unknown questionAnswerId' });

    const existingForSet = await depreciationMatrixRepository.list({ depreciationConfigId, questionAnswerId, isActive: true });
    if (existingForSet.length > 0) {
      return res.status(409).json({ error: `questionAnswerId ${questionAnswerId} already has a deduction in this set - update it instead, or re-upload the whole set` });
    }

    const now = new Date().toISOString();
    const entry: DepreciationMatrixEntry = {
      id: nextId('depreciation_matrix'),
      depreciationConfigId,
      questionAnswerId,
      depreciationType: depreciationType as 'percentage' | 'absolute',
      depreciationValue,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await depreciationMatrixRepository.create(entry);
    return res.status(201).json(entry);
  } catch (err) {
    return next(err);
  }
});

depreciationMatrixRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const entry = id !== undefined ? await depreciationMatrixRepository.findById(id) : undefined;
    if (!entry) return res.status(404).json({ error: 'Depreciation matrix entry not found' });
    return res.json(entry);
  } catch (err) {
    return next(err);
  }
});

depreciationMatrixRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await depreciationMatrixRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Depreciation matrix entry not found' });

    const { depreciationType, depreciationValue, isActive } = req.body as {
      depreciationType?: string;
      depreciationValue?: number;
      isActive?: boolean;
    };
    if (depreciationType !== undefined && !DEPRECIATION_TYPES.includes(depreciationType as (typeof DEPRECIATION_TYPES)[number])) {
      return res.status(400).json({ error: `depreciationType must be one of: ${DEPRECIATION_TYPES.join(', ')}` });
    }
    if (depreciationValue !== undefined && (Number.isNaN(depreciationValue) || depreciationValue < 0)) {
      return res.status(400).json({ error: 'depreciationValue must be a non-negative number' });
    }
    const effectiveType = (depreciationType as 'percentage' | 'absolute' | undefined) ?? existing.depreciationType;
    if (effectiveType === 'percentage' && depreciationValue !== undefined && depreciationValue > 100) {
      return res.status(400).json({ error: 'depreciationValue for a "percentage" entry cannot exceed 100' });
    }

    const updated = await depreciationMatrixRepository.update(id, {
      depreciationType: depreciationType as 'percentage' | 'absolute' | undefined,
      depreciationValue,
      isActive,
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
