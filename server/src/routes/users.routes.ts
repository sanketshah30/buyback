import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.middleware';
import {
  partnerLocationRepository,
  roleRepository,
  userLocationHistoryRepository,
  userRepository,
  userRoleRepository,
} from '../repositories';

export const usersRouter = Router();
usersRouter.use(requireAuth);

const MOBILE_REGEX = /^[0-9]{10}$/;

// List/search is POST + body, never GET + query string - see server/README.md.
usersRouter.post('/search', async (req, res, next) => {
  try {
    const { partnerLocationId, isActive } = req.body as { partnerLocationId?: string; isActive?: boolean };
    const users = partnerLocationId
      ? await userRepository.listByLocation(partnerLocationId)
      : await userRepository.list({ isActive });
    const filtered = isActive === undefined || !partnerLocationId ? users : users.filter((u) => u.isActive === isActive);
    return res.json(filtered);
  } catch (err) {
    return next(err);
  }
});

/**
 * Onboard a partner/vendor staff user. This is an upsert keyed by mobile
 * number: if a User already exists for that mobile (e.g. they previously
 * signed up as a plain buyback customer via OTP login), it's updated in
 * place with the onboarding details rather than erroring, since a user and
 * their mobile+OTP login identity are the same record either way.
 */
usersRouter.post('/', async (req, res, next) => {
  try {
    const { mobile, username, email, name, partnerLocationId, roleIds } = req.body as {
      mobile?: string;
      username?: string;
      email?: string;
      name?: string;
      partnerLocationId?: string;
      roleIds?: string[];
    };

    if (!mobile || !MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({ error: 'A valid 10-digit mobile number is required' });
    }
    if (partnerLocationId) {
      const location = await partnerLocationRepository.findById(partnerLocationId);
      if (!location) return res.status(404).json({ error: 'Unknown partnerLocationId' });
    }
    if (username) {
      const clash = await userRepository.findByUsername(username);
      if (clash && clash.mobile !== mobile) {
        return res.status(409).json({ error: `Username "${username}" is already taken` });
      }
    }
    if (email) {
      const clash = await userRepository.findByEmail(email);
      if (clash && clash.mobile !== mobile) {
        return res.status(409).json({ error: `Email "${email}" is already in use` });
      }
    }

    let user = await userRepository.findByMobile(mobile);
    const previousLocationId = user?.partnerLocationId;
    if (user) {
      user = await userRepository.update(user.id, { username, email, name, partnerLocationId });
    } else {
      user = await userRepository.create(mobile, { username, email, name, partnerLocationId });
    }

    if (partnerLocationId && partnerLocationId !== previousLocationId) {
      await userLocationHistoryRepository.record({
        id: uuid(),
        userId: user.id,
        fromPartnerLocationId: previousLocationId,
        toPartnerLocationId: partnerLocationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });
    }

    if (roleIds?.length) {
      for (const roleId of roleIds) {
        const role = await roleRepository.findById(roleId);
        if (!role) return res.status(404).json({ error: `Unknown roleId "${roleId}"` });
        const existingAssignment = await userRoleRepository.findActive(user.id, roleId);
        if (!existingAssignment) {
          await userRoleRepository.assign({
            id: uuid(),
            userId: user.id,
            roleId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
          });
        }
      }
    }

    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
});

usersRouter.get('/:id', async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

usersRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await userRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const { username, email, name, isActive } = req.body as {
      username?: string;
      email?: string;
      name?: string;
      isActive?: boolean;
    };
    if (username) {
      const clash = await userRepository.findByUsername(username);
      if (clash && clash.id !== existing.id) return res.status(409).json({ error: `Username "${username}" is already taken` });
    }
    if (email) {
      const clash = await userRepository.findByEmail(email);
      if (clash && clash.id !== existing.id) return res.status(409).json({ error: `Email "${email}" is already in use` });
    }

    const updated = await userRepository.update(req.params.id, { username, email, name, isActive });
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

/**
 * Dedicated endpoint for changing a user's current location, per the
 * requirement to log every location change for effective tracking - this
 * is the only way a user's `partnerLocationId` should be moved day-to-day
 * (as opposed to the general onboarding PATCH above).
 */
usersRouter.post('/:id/location', async (req, res, next) => {
  try {
    const existing = await userRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const { partnerLocationId, changedByUserId } = req.body as { partnerLocationId?: string; changedByUserId?: string };
    if (!partnerLocationId) return res.status(400).json({ error: 'partnerLocationId is required' });

    const location = await partnerLocationRepository.findById(partnerLocationId);
    if (!location) return res.status(404).json({ error: 'Unknown partnerLocationId' });

    const previousLocationId = existing.partnerLocationId;
    if (previousLocationId === partnerLocationId) {
      return res.json(existing);
    }

    const updated = await userRepository.update(req.params.id, { partnerLocationId });
    await userLocationHistoryRepository.record({
      id: uuid(),
      userId: existing.id,
      fromPartnerLocationId: previousLocationId,
      toPartnerLocationId: partnerLocationId,
      changedByUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    });

    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

usersRouter.get('/:id/location-history', async (req, res, next) => {
  try {
    const existing = await userRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    const history = await userLocationHistoryRepository.listByUser(req.params.id);
    return res.json(history);
  } catch (err) {
    return next(err);
  }
});

usersRouter.get('/:id/roles', async (req, res, next) => {
  try {
    const existing = await userRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    const assignments = await userRoleRepository.listByUser(req.params.id);
    const roles = await Promise.all(assignments.map((a) => roleRepository.findById(a.roleId)));
    return res.json(roles.filter(Boolean));
  } catch (err) {
    return next(err);
  }
});

usersRouter.post('/:id/roles', async (req, res, next) => {
  try {
    const existing = await userRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const { roleId } = req.body as { roleId?: string };
    if (!roleId) return res.status(400).json({ error: 'roleId is required' });
    const role = await roleRepository.findById(roleId);
    if (!role) return res.status(404).json({ error: 'Unknown roleId' });

    const alreadyAssigned = await userRoleRepository.findActive(existing.id, roleId);
    if (alreadyAssigned) return res.status(200).json(alreadyAssigned);

    const assignment = await userRoleRepository.assign({
      id: uuid(),
      userId: existing.id,
      roleId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    });
    return res.status(201).json(assignment);
  } catch (err) {
    return next(err);
  }
});

usersRouter.delete('/:id/roles/:roleId', async (req, res, next) => {
  try {
    const existing = await userRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    await userRoleRepository.revoke(req.params.id, req.params.roleId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});
