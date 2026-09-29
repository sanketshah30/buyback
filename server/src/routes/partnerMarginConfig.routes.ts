import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { catalogRepository, partnerLocationRepository, partnerMarginConfigRepository, partnerRepository } from '../repositories';
import { PartnerMarginConfig } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const partnerMarginConfigRouter = Router();
partnerMarginConfigRouter.use(requireAuth);

/** `partnerLocationId` is a literal, non-nullable 0 sentinel ("all locations") - see PartnerMarginConfig doc comment in types/domain.ts. `undefined`/missing defaults to 0. */
function parseLocationId(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return 0;
  return parseId(raw);
}

// List/search and the "resolve" lookup are POST + body, never GET + query
// string - see server/README.md.
partnerMarginConfigRouter.post('/search', async (req, res, next) => {
  try {
    const partnerId = req.body?.partnerId !== undefined ? parseId(req.body.partnerId) : undefined;
    const partnerLocationId = req.body?.partnerLocationId !== undefined ? parseLocationId(req.body.partnerLocationId) : undefined;
    const productCategoryId = req.body?.productCategoryId !== undefined ? parseId(req.body.productCategoryId) : undefined;
    const { isActive } = req.body as { isActive?: boolean };
    const configs = await partnerMarginConfigRepository.list({ partnerId, partnerLocationId, productCategoryId, isActive });
    return res.json(configs);
  } catch (err) {
    return next(err);
  }
});

/** The calculation engine's lookup: exact (partnerId, partnerLocationId, productCategoryId) match, falling back to the partnerLocationId=0 "all locations" wildcard. */
partnerMarginConfigRouter.post('/resolve', async (req, res, next) => {
  try {
    const partnerId = parseId(req.body?.partnerId);
    const partnerLocationId = parseLocationId(req.body?.partnerLocationId);
    const productCategoryId = parseId(req.body?.productCategoryId);
    if (!partnerId || partnerLocationId === undefined || !productCategoryId) {
      return res.status(400).json({ error: 'partnerId and productCategoryId are required (partnerLocationId defaults to 0 = all locations)' });
    }
    const resolved = await partnerMarginConfigRepository.resolve(partnerId, partnerLocationId, productCategoryId);
    return res.json({ partnerId, partnerLocationId, productCategoryId, result: resolved ?? null });
  } catch (err) {
    return next(err);
  }
});

partnerMarginConfigRouter.post('/', async (req, res, next) => {
  try {
    const partnerId = parseId(req.body?.partnerId);
    const partnerLocationId = parseLocationId(req.body?.partnerLocationId);
    const productCategoryId = parseId(req.body?.productCategoryId);
    const { marginPercent } = req.body as { marginPercent?: number };

    if (!partnerId || !productCategoryId) {
      return res.status(400).json({ error: 'partnerId and productCategoryId are required' });
    }
    if (partnerLocationId === undefined) {
      return res.status(400).json({ error: 'partnerLocationId must be a valid integer id, or 0/omitted for all locations' });
    }
    if (typeof marginPercent !== 'number' || Number.isNaN(marginPercent) || marginPercent < 0 || marginPercent > 100) {
      return res.status(400).json({ error: 'marginPercent is required and must be between 0 and 100' });
    }

    const partner = await partnerRepository.findById(partnerId);
    if (!partner) return res.status(404).json({ error: 'Unknown partnerId' });
    if (partnerLocationId !== 0) {
      const location = await partnerLocationRepository.findById(partnerLocationId);
      if (!location) return res.status(404).json({ error: 'Unknown partnerLocationId' });
    }
    const category = await catalogRepository.getCategory(productCategoryId);
    if (!category) return res.status(404).json({ error: 'Unknown productCategoryId' });

    const existing = await partnerMarginConfigRepository.findByScope(partnerId, partnerLocationId, productCategoryId);
    if (existing) return res.status(200).json(existing);

    const now = new Date().toISOString();
    const config: PartnerMarginConfig = {
      id: nextId('partner_margin_config'),
      partnerId,
      partnerLocationId,
      productCategoryId,
      marginPercent,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await partnerMarginConfigRepository.create(config);
    return res.status(201).json(config);
  } catch (err) {
    return next(err);
  }
});

partnerMarginConfigRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const config = id !== undefined ? await partnerMarginConfigRepository.findById(id) : undefined;
    if (!config) return res.status(404).json({ error: 'Partner margin config not found' });
    return res.json(config);
  } catch (err) {
    return next(err);
  }
});

partnerMarginConfigRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await partnerMarginConfigRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Partner margin config not found' });

    const { marginPercent, isActive } = req.body as { marginPercent?: number; isActive?: boolean };
    if (marginPercent !== undefined && (Number.isNaN(marginPercent) || marginPercent < 0 || marginPercent > 100)) {
      return res.status(400).json({ error: 'marginPercent must be between 0 and 100' });
    }

    const updated = await partnerMarginConfigRepository.update(id, { marginPercent, isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
