import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { catalogRepository, partnerCategoryVendorMappingRepository, partnerLocationRepository, partnerRepository } from '../repositories';
import { PartnerCategoryVendorMapping } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const partnerCategoryVendorMappingRouter = Router();
partnerCategoryVendorMappingRouter.use(requireAuth);

// List/search and the "resolve" lookup are POST + body, never GET + query
// string - see server/README.md.
partnerCategoryVendorMappingRouter.post('/search', async (req, res, next) => {
  try {
    const partnerLocationId = req.body?.partnerLocationId !== undefined ? parseId(req.body.partnerLocationId) : undefined;
    const productCategoryId = req.body?.productCategoryId !== undefined ? parseId(req.body.productCategoryId) : undefined;
    const vendorId = req.body?.vendorId !== undefined ? parseId(req.body.vendorId) : undefined;
    const { isActive } = req.body as { isActive?: boolean };
    const mappings = await partnerCategoryVendorMappingRepository.list({ partnerLocationId, productCategoryId, vendorId, isActive });
    return res.json(mappings);
  } catch (err) {
    return next(err);
  }
});

/**
 * The calculation engine's main lookup: "which vendor(s) does this retail
 * partner *location* use for buybacks in this device category?" Returns
 * the active vendor Partner rows directly (not the raw mapping rows) since
 * that's what a caller actually needs next.
 */
partnerCategoryVendorMappingRouter.post('/resolve', async (req, res, next) => {
  try {
    const partnerLocationId = parseId(req.body?.partnerLocationId);
    const productCategoryId = parseId(req.body?.productCategoryId);
    if (!partnerLocationId || !productCategoryId) {
      return res.status(400).json({ error: 'partnerLocationId and productCategoryId are required' });
    }
    const mappings = await partnerCategoryVendorMappingRepository.listVendorsFor(partnerLocationId, productCategoryId);
    const vendors = (await Promise.all(mappings.map((m) => partnerRepository.findById(m.vendorId)))).filter(Boolean);
    return res.json({ partnerLocationId, productCategoryId, vendors });
  } catch (err) {
    return next(err);
  }
});

partnerCategoryVendorMappingRouter.post('/', async (req, res, next) => {
  try {
    const partnerLocationId = parseId(req.body?.partnerLocationId);
    const productCategoryId = parseId(req.body?.productCategoryId);
    const vendorId = parseId(req.body?.vendorId);
    if (!partnerLocationId || !productCategoryId || !vendorId) {
      return res.status(400).json({ error: 'partnerLocationId, productCategoryId and vendorId are required' });
    }

    const location = await partnerLocationRepository.findById(partnerLocationId);
    if (!location) return res.status(404).json({ error: 'Unknown partnerLocationId' });
    const category = await catalogRepository.getCategory(productCategoryId);
    if (!category) return res.status(404).json({ error: 'Unknown productCategoryId' });
    const vendor = await partnerRepository.findById(vendorId);
    if (!vendor) return res.status(404).json({ error: 'Unknown vendorId' });

    // Not unique on (partnerLocationId, productCategoryId) by design -
    // several vendors can be eligible for the same location+category - but
    // avoid storing the exact same triple twice.
    const existing = await partnerCategoryVendorMappingRepository.list({ partnerLocationId, productCategoryId, vendorId });
    const duplicate = existing.find((m) => m.isActive);
    if (duplicate) return res.status(200).json(duplicate);

    const now = new Date().toISOString();
    const mapping: PartnerCategoryVendorMapping = {
      id: nextId('partner_category_vendor_mapping'),
      partnerLocationId,
      productCategoryId,
      vendorId,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await partnerCategoryVendorMappingRepository.create(mapping);
    return res.status(201).json(mapping);
  } catch (err) {
    return next(err);
  }
});

partnerCategoryVendorMappingRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const mapping = id !== undefined ? await partnerCategoryVendorMappingRepository.findById(id) : undefined;
    if (!mapping) return res.status(404).json({ error: 'Mapping not found' });
    return res.json(mapping);
  } catch (err) {
    return next(err);
  }
});

partnerCategoryVendorMappingRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await partnerCategoryVendorMappingRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Mapping not found' });

    const { isActive } = req.body as { isActive?: boolean };
    const vendorId = req.body?.vendorId !== undefined ? parseId(req.body.vendorId) : undefined;
    if (req.body?.vendorId !== undefined && vendorId === undefined) {
      return res.status(400).json({ error: 'vendorId must be a valid integer id' });
    }
    if (vendorId !== undefined) {
      const vendor = await partnerRepository.findById(vendorId);
      if (!vendor) return res.status(404).json({ error: 'Unknown vendorId' });
    }

    const updated = await partnerCategoryVendorMappingRepository.update(id, { vendorId, isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
