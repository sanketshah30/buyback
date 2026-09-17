import { User, UserRole } from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';
import { LOCATION_BESTBUY_NYC_ID, ROLE_PARTNER_ADMIN_ID, ROLE_PROMOTER_ID, ROLE_SUPER_ADMIN_ID } from './partner.seed';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/**
 * Table: users
 * Login is now **whitelist-only** (see auth.service.ts): a mobile number
 * must already have a `User` row here, with at least one active role, for
 * `POST /api/auth/otp/request` (purpose "login") to even send an OTP.
 * Self-signup no longer happens - unlike buyback-confirmation OTPs (which
 * still work for any customer mobile, since that step never touches this
 * table).
 */
export const users: User[] = [
  {
    id: 1,
    mobile: '9820852131',
    name: 'Demo Promoter',
    username: 'demo.promoter',
    partnerLocationId: LOCATION_BESTBUY_NYC_ID,
    ...audit,
  },
  {
    id: 2,
    mobile: '9000000002',
    name: 'Demo Partner Admin',
    username: 'demo.partner.admin',
    partnerLocationId: LOCATION_BESTBUY_NYC_ID,
    ...audit,
  },
  {
    id: 3,
    mobile: '9000000003',
    name: 'Demo Super Admin',
    username: 'demo.super.admin',
    ...audit,
  },
];
export const DEMO_PROMOTER_USER_ID = 1;
export const DEMO_PARTNER_ADMIN_USER_ID = 2;
export const DEMO_SUPER_ADMIN_USER_ID = 3;

/** Table: user_roles - FKs: userId -> users.id, roleId -> roles.id */
export const userRoles: UserRole[] = [
  { id: 1, userId: DEMO_PROMOTER_USER_ID, roleId: ROLE_PROMOTER_ID, ...audit },
  { id: 2, userId: DEMO_PARTNER_ADMIN_USER_ID, roleId: ROLE_PARTNER_ADMIN_ID, ...audit },
  { id: 3, userId: DEMO_SUPER_ADMIN_USER_ID, roleId: ROLE_SUPER_ADMIN_ID, ...audit },
];

reserveIdRange('users', users.length);
reserveIdRange('user_roles', userRoles.length);
