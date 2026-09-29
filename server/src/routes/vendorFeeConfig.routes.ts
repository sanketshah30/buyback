import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { catalogRepository, partnerRepository, vendorFeeConfigRepository } from '../repositories';
import { VendorFeeConfig } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const vendorFeeConfigRouter = Router();
vendorFeeConfigRouter.use(requireAuth);

// List/search and the "resolve" lookup are POST + body, never GET + query
// string - see server/README.md.
vendorFeeConfigRouter.post('/search', async (req, res, next) => {
  try {
    const vendorId = req.body?.vendorId !== undefined ? parseId(req.body.vendorId) : undefined;
    const productCategoryId = req.body?.productCategoryId !== undefined ? parseId(req.body.productCategoryId) : undefined;
    const { isActive } = req.body as { isActive?: boolean };
    const configs = await vendorFeeConfigRepository.list({ vendorId, productCategoryId, isActive });
    return res.json(configs);
  } catch (err) {
    return next(err);
  }
});

/** The calculation engine's lookup: exact (vendorId, productCategoryId) match - no wildcard for this config. */
vendorFeeConfigRouter.post('/resolve', async (req, res, next) => {
  try {
    const vendorId = parseId(req.body?.vendorId);
    const productCategoryId = parseId(req.body?.productCategoryId);
    if (!vendorId || !productCategoryId) {
      return res.status(400).json({ error: 'vendorId and productCategoryId are required' });
    }
    const resolved = await vendorFeeConfigRepository.resolve(vendorId, productCategoryId);
    return res.json({ vendorId, productCategoryId, result: resolved ?? null });
  } catch (err) {
    return next(err);
  }
});

vendorFeeConfigRouter.post('/', async (req, res, next) => {
  try {
    const vendorId = parseId(req.body?.vendorId);
    const productCategoryId = parseId(req.body?.productCategoryId);
    const { feeAmount } = req.body as { feeAmount?: number };

    if (!vendorId || !productCategoryId) {
      return res.status(400).json({ error: 'vendorId and productCategoryId are required' });
    }
    if (typeof feeAmount !== 'number' || Number.isNaN(feeAmount) || feeAmount < 0) {
      return res.status(400).json({ error: 'feeAmount is required and must be a non-negative number' });
    }

    const vendor = await partnerRepository.findById(vendorId);
    if (!vendor) return res.status(404).json({ error: 'Unknown vendorId' });
    const category = await catalogRepository.getCategory(productCategoryId);
    if (!category) return res.status(404).json({ error: 'Unknown productCategoryId' });

    const existing = await vendorFeeConfigRepository.findByScope(vendorId, productCategoryId);
    if (existing) return res.status(200).json(existing);

    const now = new Date().toISOString();
    const config: VendorFeeConfig = {
      id: nextId('vendor_fee_config'),
      vendorId,
      productCategoryId,
      feeAmount,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await vendorFeeConfigRepository.create(config);
    return res.status(201).json(config);
  } catch (err) {
    return next(err);
  }
});

vendorFeeConfigRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const config = id !== undefined ? await vendorFeeConfigRepository.findById(id) : undefined;
    if (!config) return res.status(404).json({ error: 'Vendor fee config not found' });
    return res.json(config);
  } catch (err) {
    return next(err);
  }
});

vendorFeeConfigRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await vendorFeeConfigRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Vendor fee config not found' });

    const { feeAmount, isActive } = req.body as { feeAmount?: number; isActive?: boolean };
    if (feeAmount !== undefined && (Number.isNaN(feeAmount) || feeAmount < 0)) {
      return res.status(400).json({ error: 'feeAmount must be a non-negative number' });
    }

    const updated = await vendorFeeConfigRepository.update(id, { feeAmount, isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
