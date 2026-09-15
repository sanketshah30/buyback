import { NextFunction, Response } from 'express';
import { roleRepository, userRoleRepository } from '../repositories';
import { AuthedRequest } from './auth.middleware';

/**
 * Authorization gate: requires the logged-in user to hold at least one
 * active role whose `rights` list includes `right` (e.g. `"process_buyback"`
 * for the Promoter role - see data/partner.seed.ts). Must run after
 * `requireAuth` so `req.auth` is populated.
 */
export function requireRight(right: string) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth!.userId;
      const assignments = await userRoleRepository.listByUser(userId);
      const roles = await Promise.all(assignments.map((a) => roleRepository.findById(a.roleId)));
      const hasRight = roles.some((role) => role?.isActive && role.rights.includes(right));
      if (!hasRight) {
        return res.status(403).json({ error: `Your role does not have the "${right}" permission` });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
