import { partnerLocations, partners, roles } from '../../data/partner.seed';
import {
  BuybackRequest,
  OtpChallenge,
  Partner,
  PartnerLocation,
  Role,
  User,
  UserLocationHistory,
  UserRole,
} from '../../types/domain';

/**
 * A single process-memory "database". Data resets whenever the server
 * restarts - this is intentional for the MVP. Replace this module with a
 * MySQL connection pool (e.g. `mysql2/promise`) when persistence is needed.
 *
 * Partner/location/role tables are seeded but fully mutable (unlike the
 * read-only product catalog) since onboarding new partners/locations/roles
 * is a first-class feature of this module.
 */
export const tables = {
  users: new Map<string, User>(),
  usersByMobile: new Map<string, string>(), // mobile -> userId
  otpChallenges: new Map<string, OtpChallenge>(),
  buybackRequests: new Map<string, BuybackRequest>(),
  dailySequences: new Map<string, number>(), // dateKey -> last count

  partners: new Map<string, Partner>(partners.map((p) => [p.id, p])),
  partnerLocations: new Map<string, PartnerLocation>(partnerLocations.map((l) => [l.id, l])),
  roles: new Map<string, Role>(roles.map((r) => [r.id, r])),
  userRoles: new Map<string, UserRole>(), // keyed by UserRole.id
  userLocationHistory: new Map<string, UserLocationHistory>(), // keyed by UserLocationHistory.id, append-only
};
