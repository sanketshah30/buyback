import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth.middleware';
import { catalogRepository, depreciationConfigRepository, depreciationMatrixRepository, partnerRepository, userRepository } from '../repositories';
import { depreciationService, DepreciationEntryInput } from '../services/depreciation.service';
import { parseId } from '../utils/parseId';

export const depreciationConfigRouter = Router();
depreciationConfigRouter.use(requireAuth);

// List/search and the "resolve" lookup are POST + body, never GET + query
// string - see server/README.md.
depreciationConfigRouter.post('/search', async (req, res, next) => {
  try {
    const productCategoryId = req.body?.productCategoryId !== undefined ? parseId(req.body.productCategoryId) : undefined;
    const brandId = req.body?.brandId !== undefined ? parseId(req.body.brandId) : undefined;
    const vendorId = req.body?.vendorId !== undefined ? (req.body.vendorId === null ? null : parseId(req.body.vendorId)) : undefined;
    const { isActive } = req.body as { isActive?: boolean };
    const configs = await depreciationConfigRepository.list({ productCategoryId, brandId, vendorId, isActive });
    return res.json(configs);
  } catch (err) {
    return next(err);
  }
});

/**
 * The calculation engine's main lookup: given a (category, brand, vendor?)
 * scope, resolve the single applicable depreciation set (exact vendor
 * match, falling back to the wildcard set) and return it with its full
 * matrix of question-answer deductions.
 */
depreciationConfigRouter.post('/resolve', async (req, res, next) => {
  try {
    const productCategoryId = parseId(req.body?.productCategoryId);
    const brandId = parseId(req.body?.brandId);
    const vendorId = req.body?.vendorId !== undefined && req.body?.vendorId !== null ? parseId(req.body.vendorId) : undefined;
    const asOf = typeof req.body?.asOf === 'string' ? new Date(req.body.asOf) : new Date();
    if (!productCategoryId || !brandId) {
      return res.status(400).json({ error: 'productCategoryId and brandId are required' });
    }

    const resolved = await depreciationService.resolve(productCategoryId, brandId, vendorId, asOf);
    return res.json({ productCategoryId, brandId, vendorId: vendorId ?? null, asOf: asOf.toISOString(), result: resolved ?? null });
  } catch (err) {
    return next(err);
  }
});

/**
 * "Upload" a whole depreciation set in one call: body
 * `{ productCategoryId, brandId, vendorId?, entries: [{ questionAnswerId, depreciationType, depreciationValue }], uploadedById? }`.
 * Re-uploading the same (productCategoryId, brandId, vendorId) triple
 * versions the existing set rather than erroring - see
 * `depreciationService.upload()`.
 */
depreciationConfigRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const productCategoryId = parseId(req.body?.productCategoryId);
    const brandId = parseId(req.body?.brandId);
    const vendorId = req.body?.vendorId !== undefined && req.body?.vendorId !== null ? parseId(req.body.vendorId) : undefined;
    const uploadedById = req.body?.uploadedById !== undefined ? parseId(req.body.uploadedById) : req.auth?.userId;
    const entries = req.body?.entries as DepreciationEntryInput[] | undefined;

    if (!productCategoryId || !brandId) {
      return res.status(400).json({ error: 'productCategoryId and brandId are required' });
    }
    if (req.body?.vendorId !== undefined && req.body?.vendorId !== null && vendorId === undefined) {
      return res.status(400).json({ error: 'vendorId must be a valid integer id, or null/omitted for all vendors' });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries is required and must be a non-empty array of { questionAnswerId, depreciationType, depreciationValue }' });
    }
    if (!uploadedById) {
      return res.status(400).json({ error: 'uploadedById is required' });
    }

    const category = await catalogRepository.getCategory(productCategoryId);
    if (!category) return res.status(404).json({ error: 'Unknown productCategoryId' });
    const brand = await catalogRepository.getBrand(brandId);
    if (!brand) return res.status(404).json({ error: 'Unknown brandId' });
    if (vendorId !== undefined) {
      const vendor = await partnerRepository.findById(vendorId);
      if (!vendor) return res.status(404).json({ error: 'Unknown vendorId' });
    }
    const uploadedBy = await userRepository.findById(uploadedById);
    if (!uploadedBy) return res.status(404).json({ error: 'Unknown uploadedById' });

    const result = await depreciationService.upload(productCategoryId, brandId, vendorId ?? null, entries, uploadedById);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

depreciationConfigRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const config = id !== undefined ? await depreciationConfigRepository.findById(id) : undefined;
    if (!config) return res.status(404).json({ error: 'Depreciation config not found' });
    return res.json(config);
  } catch (err) {
    return next(err);
  }
});

depreciationConfigRouter.get('/:id/matrix', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const config = id !== undefined ? await depreciationConfigRepository.findById(id) : undefined;
    if (!config || id === undefined) return res.status(404).json({ error: 'Depreciation config not found' });
    const matrix = await depreciationMatrixRepository.listByConfig(id);
    return res.json(matrix);
  } catch (err) {
    return next(err);
  }
});

// Lightweight update - e.g. deactivate a whole set, or manually close its
// validTo. Editing individual question-answer deductions is done via
// /api/depreciation-matrix/:id, or by re-uploading the whole set (which
// versions it - see depreciationService.upload()).
depreciationConfigRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await depreciationConfigRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Depreciation config not found' });

    const { validTo, isActive } = req.body as { validTo?: string | null; isActive?: boolean };
    const updated = await depreciationConfigRepository.update(id, {
      validTo: validTo === null ? undefined : validTo,
      isActive,
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
