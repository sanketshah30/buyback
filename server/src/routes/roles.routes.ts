import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { roleRepository } from '../repositories';
import { Role } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { parseId } from '../utils/parseId';

export const rolesRouter = Router();
rolesRouter.use(requireAuth);

rolesRouter.post('/search', async (req, res, next) => {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    const roles = await roleRepository.list({ isActive });
    return res.json(roles);
  } catch (err) {
    return next(err);
  }
});

rolesRouter.post('/', async (req, res, next) => {
  try {
    const { name, rights } = req.body as { name?: string; rights?: string[] };
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (rights !== undefined && !Array.isArray(rights)) {
      return res.status(400).json({ error: 'rights must be an array of permission-key strings' });
    }

    const now = new Date().toISOString();
    const role: Role = {
      id: nextId('roles'),
      name,
      rights: rights ?? [],
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    await roleRepository.create(role);
    return res.status(201).json(role);
  } catch (err) {
    return next(err);
  }
});

rolesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const role = id !== undefined ? await roleRepository.findById(id) : undefined;
    if (!role) return res.status(404).json({ error: 'Role not found' });
    return res.json(role);
  } catch (err) {
    return next(err);
  }
});

rolesRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = id !== undefined ? await roleRepository.findById(id) : undefined;
    if (!existing || id === undefined) return res.status(404).json({ error: 'Role not found' });

    const { rights } = req.body as { rights?: string[] };
    if (rights !== undefined && !Array.isArray(rights)) {
      return res.status(400).json({ error: 'rights must be an array of permission-key strings' });
    }

    const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...patch } = req.body as Partial<Role>;
    const updated = await roleRepository.update(id, patch);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
