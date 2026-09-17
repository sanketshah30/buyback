import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { partnerRepository } from '../repositories';
import { Partner, PartnerType } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const partnersRouter = Router();
partnersRouter.use(requireAuth);

const PARTNER_TYPES: PartnerType[] = ['vendor', 'retailer'];

function validatePartnerBody(body: Partial<Partner>): string | null {
  if (!body.name) return 'name is required';
  if (!body.address) return 'address is required';
  if (!body.city) return 'city is required';
  if (!body.state) return 'state is required';
  if (!body.zipCode) return 'zipCode is required';
  if (!body.country) return 'country is required';
  if (!body.partnerType || !PARTNER_TYPES.includes(body.partnerType)) {
    return `partnerType must be one of: ${PARTNER_TYPES.join(', ')}`;
  }
  if (!body.uniqueIdentifier) return 'uniqueIdentifier is required';
  return null;
}

// List/search is POST + body (never GET + query string) so filter values never
// appear in URLs/logs/browser history - see server/README.md.
partnersRouter.post('/search', async (req, res, next) => {
  try {
    const { isActive, partnerType } = req.body as { isActive?: boolean; partnerType?: PartnerType };
    const partners = await partnerRepository.list({ isActive, partnerType });
    return res.json(partners);
  } catch (err) {
    return next(err);
  }
});

partnersRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<Partner>;
    const error = validatePartnerBody(body);
    if (error) return res.status(400).json({ error });

    const existing = await partnerRepository.findByUniqueIdentifier(body.uniqueIdentifier!);
    if (existing) {
      return res.status(409).json({ error: `A partner with uniqueIdentifier "${body.uniqueIdentifier}" already exists` });
    }

    const now = new Date().toISOString();
    const partner: Partner = {
      id: nextId('partners'),
      name: body.name!,
      address: body.address!,
      city: body.city!,
      state: body.state!,
      zipCode: body.zipCode!,
      country: body.country!,
      partnerType: body.partnerType!,
      uniqueIdentifier: body.uniqueIdentifier!,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await partnerRepository.create(partner);
    return res.status(201).json(partner);
  } catch (err) {
    return next(err);
  }
});

partnersRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const partner = id !== undefined ? await partnerRepository.findById(id) : undefined;
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    return res.json(partner);
  } catch (err) {
    return next(err);
  }
});

partnersRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await partnerRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Partner not found' });

    const body = req.body as Partial<Partner>;
    if (body.partnerType && !PARTNER_TYPES.includes(body.partnerType)) {
      return res.status(400).json({ error: `partnerType must be one of: ${PARTNER_TYPES.join(', ')}` });
    }
    if (body.uniqueIdentifier && body.uniqueIdentifier !== existing.uniqueIdentifier) {
      const clash = await partnerRepository.findByUniqueIdentifier(body.uniqueIdentifier);
      if (clash) return res.status(409).json({ error: `A partner with uniqueIdentifier "${body.uniqueIdentifier}" already exists` });
    }

    const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...patch } = body;
    const updated = await partnerRepository.update(id, patch);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
