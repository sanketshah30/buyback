import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { partnerLocationRepository, partnerRepository } from '../repositories';
import { PartnerLocation } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const partnerLocationsRouter = Router();
partnerLocationsRouter.use(requireAuth);

function validateLocationBody(body: { partnerId?: number } & Partial<PartnerLocation>): string | null {
  if (!body.partnerId) return 'partnerId is required';
  if (!body.name) return 'name is required';
  if (!body.address) return 'address is required';
  if (!body.city) return 'city is required';
  if (!body.state) return 'state is required';
  if (!body.zipCode) return 'zipCode is required';
  if (!body.country) return 'country is required';
  if (!body.uniqueIdentifier) return 'uniqueIdentifier is required';
  return null;
}

// List/search is POST + body, never GET + query string - see server/README.md.
partnerLocationsRouter.post('/search', async (req, res, next) => {
  try {
    const partnerId = parseId(req.body?.partnerId);
    const { isActive } = req.body as { isActive?: boolean };
    const locations = partnerId
      ? await partnerLocationRepository.listByPartner(partnerId)
      : await partnerLocationRepository.list({ isActive });
    const filtered = isActive === undefined ? locations : locations.filter((l) => l.isActive === isActive);
    return res.json(filtered);
  } catch (err) {
    return next(err);
  }
});

partnerLocationsRouter.post('/', async (req, res, next) => {
  try {
    const partnerId = parseId(req.body?.partnerId);
    const body = { ...(req.body as Partial<PartnerLocation>), partnerId };
    const error = validateLocationBody(body);
    if (error) return res.status(400).json({ error });

    const partner = await partnerRepository.findById(partnerId!);
    if (!partner) return res.status(404).json({ error: 'Unknown partnerId' });

    const existing = await partnerLocationRepository.findByUniqueIdentifier(body.uniqueIdentifier!);
    if (existing) {
      return res.status(409).json({ error: `A location with uniqueIdentifier "${body.uniqueIdentifier}" already exists` });
    }

    const now = new Date().toISOString();
    const location: PartnerLocation = {
      id: nextId('partner_locations'),
      partnerId: partnerId!,
      name: body.name!,
      address: body.address!,
      city: body.city!,
      state: body.state!,
      zipCode: body.zipCode!,
      country: body.country!,
      uniqueIdentifier: body.uniqueIdentifier!,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await partnerLocationRepository.create(location);
    return res.status(201).json(location);
  } catch (err) {
    return next(err);
  }
});

partnerLocationsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const location = id !== undefined ? await partnerLocationRepository.findById(id) : undefined;
    if (!location) return res.status(404).json({ error: 'Partner location not found' });
    return res.json(location);
  } catch (err) {
    return next(err);
  }
});

partnerLocationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await partnerLocationRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Partner location not found' });

    const patchPartnerId = req.body?.partnerId !== undefined ? parseId(req.body.partnerId) : undefined;
    const body = { ...(req.body as Partial<PartnerLocation>), partnerId: patchPartnerId };
    if (patchPartnerId !== undefined && patchPartnerId !== existing.partnerId) {
      const partner = await partnerRepository.findById(patchPartnerId);
      if (!partner) return res.status(404).json({ error: 'Unknown partnerId' });
    }
    if (body.uniqueIdentifier && body.uniqueIdentifier !== existing.uniqueIdentifier) {
      const clash = await partnerLocationRepository.findByUniqueIdentifier(body.uniqueIdentifier);
      if (clash) return res.status(409).json({ error: `A location with uniqueIdentifier "${body.uniqueIdentifier}" already exists` });
    }

    const { id: _ignoredId, createdAt: _ignoredCreatedAt, partnerId: _ignoredPartnerId, ...rest } = body;
    const patch = { ...rest, ...(patchPartnerId !== undefined ? { partnerId: patchPartnerId } : {}) };
    const updated = await partnerLocationRepository.update(id, patch);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
