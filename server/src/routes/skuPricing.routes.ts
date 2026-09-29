import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth.middleware';
import { catalogRepository, skuPricingRepository, partnerRepository, userRepository } from '../repositories';
import { SkuPricing } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const skuPricingRouter = Router();
skuPricingRouter.use(requireAuth);

// List/search and the "resolve" lookup are POST + body, never GET + query
// string - see server/README.md.
skuPricingRouter.post('/search', async (req, res, next) => {
  try {
    const vendorId = req.body?.vendorId !== undefined ? parseId(req.body.vendorId) : undefined;
    const skuId = req.body?.skuId !== undefined ? parseId(req.body.skuId) : undefined;
    const { isActive } = req.body as { isActive?: boolean };
    const pricing = await skuPricingRepository.list({ vendorId, skuId, isActive });
    return res.json(pricing);
  } catch (err) {
    return next(err);
  }
});

/**
 * The calculation engine's main lookup: "what does this vendor currently pay
 * for this SKU?" Filters the vendor+SKU's active price rows down to the one
 * whose validity window covers `asOf` (defaults to now) - blank `validTo`
 * means open-ended/current. If more than one row is somehow valid for the
 * same instant, the most recently created one wins.
 */
skuPricingRouter.post('/resolve', async (req, res, next) => {
  try {
    const vendorId = parseId(req.body?.vendorId);
    const skuId = parseId(req.body?.skuId);
    if (!vendorId || !skuId) return res.status(400).json({ error: 'vendorId and skuId are required' });
    const asOf = typeof req.body?.asOf === 'string' ? new Date(req.body.asOf) : new Date();

    const candidates = await skuPricingRepository.listForVendorSku(vendorId, skuId);
    const inWindow = candidates.filter((p) => {
      const from = new Date(p.validFrom).getTime();
      const to = p.validTo ? new Date(p.validTo).getTime() : undefined;
      return from <= asOf.getTime() && (to === undefined || asOf.getTime() < to);
    });
    inWindow.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return res.json({ vendorId, skuId, asOf: asOf.toISOString(), pricing: inWindow[0] ?? null });
  } catch (err) {
    return next(err);
  }
});

skuPricingRouter.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const vendorId = parseId(req.body?.vendorId);
    const skuId = parseId(req.body?.skuId);
    const { price, validFrom, validTo } = req.body as { price?: number; validFrom?: string; validTo?: string };
    const uploadedById = req.body?.uploadedById !== undefined ? parseId(req.body.uploadedById) : req.auth?.userId;

    if (!vendorId || !skuId) return res.status(400).json({ error: 'vendorId and skuId are required' });
    if (price === undefined || price === null || Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'price is required and must be a non-negative number' });
    }
    if (!validFrom) return res.status(400).json({ error: 'validFrom is required' });
    if (!uploadedById) return res.status(400).json({ error: 'uploadedById is required' });

    const vendor = await partnerRepository.findById(vendorId);
    if (!vendor) return res.status(404).json({ error: 'Unknown vendorId' });
    const sku = await catalogRepository.getSku(skuId);
    if (!sku) return res.status(404).json({ error: 'Unknown skuId' });
    const uploadedBy = await userRepository.findById(uploadedById);
    if (!uploadedBy) return res.status(404).json({ error: 'Unknown uploadedById' });

    const now = new Date().toISOString();
    const pricing: SkuPricing = {
      id: nextId('sku_pricing'),
      vendorId,
      skuId,
      price,
      validFrom,
      validTo: validTo || undefined, // blank/omitted = open-ended, per spec
      uploadedById,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await skuPricingRepository.create(pricing);
    return res.status(201).json(pricing);
  } catch (err) {
    return next(err);
  }
});

skuPricingRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const pricing = id !== undefined ? await skuPricingRepository.findById(id) : undefined;
    if (!pricing) return res.status(404).json({ error: 'SKU pricing not found' });
    return res.json(pricing);
  } catch (err) {
    return next(err);
  }
});

skuPricingRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await skuPricingRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'SKU pricing not found' });

    const { price, validFrom, validTo, isActive } = req.body as {
      price?: number;
      validFrom?: string;
      validTo?: string | null;
      isActive?: boolean;
    };
    if (price !== undefined && (Number.isNaN(price) || price < 0)) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }

    const updated = await skuPricingRepository.update(id, {
      price,
      validFrom,
      validTo: validTo === null ? undefined : validTo,
      isActive,
    });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
