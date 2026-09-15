import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.middleware';
import { partnerLocationRepository, partnerRepository } from '../repositories';
import { PartnerLocation } from '../types/domain';

export const partnerLocationsRouter = Router();
partnerLocationsRouter.use(requireAuth);

function validateLocationBody(body: Partial<PartnerLocation>): string | null {
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
    const { partnerId, isActive } = req.body as { partnerId?: string; isActive?: boolean };
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
    const body = req.body as Partial<PartnerLocation>;
    const error = validateLocationBody(body);
    if (error) return res.status(400).json({ error });

    const partner = await partnerRepository.findById(body.partnerId!);
    if (!partner) return res.status(404).json({ error: 'Unknown partnerId' });

    const existing = await partnerLocationRepository.findByUniqueIdentifier(body.uniqueIdentifier!);
    if (existing) {
      return res.status(409).json({ error: `A location with uniqueIdentifier "${body.uniqueIdentifier}" already exists` });
    }

    const now = new Date().toISOString();
    const location: PartnerLocation = {
      id: uuid(),
      partnerId: body.partnerId!,
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
    const location = await partnerLocationRepository.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Partner location not found' });
    return res.json(location);
  } catch (err) {
    return next(err);
  }
});

partnerLocationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await partnerLocationRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Partner location not found' });

    const body = req.body as Partial<PartnerLocation>;
    if (body.partnerId && body.partnerId !== existing.partnerId) {
      const partner = await partnerRepository.findById(body.partnerId);
      if (!partner) return res.status(404).json({ error: 'Unknown partnerId' });
    }
    if (body.uniqueIdentifier && body.uniqueIdentifier !== existing.uniqueIdentifier) {
      const clash = await partnerLocationRepository.findByUniqueIdentifier(body.uniqueIdentifier);
      if (clash) return res.status(409).json({ error: `A location with uniqueIdentifier "${body.uniqueIdentifier}" already exists` });
    }

    const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...patch } = body;
    const updated = await partnerLocationRepository.update(req.params.id, patch);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
