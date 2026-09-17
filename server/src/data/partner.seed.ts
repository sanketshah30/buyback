import { Partner, PartnerLocation, Role } from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/** Table: partners */
export const partners: Partner[] = [
  {
    id: 1,
    name: 'BestBuy',
    address: '7601 Penn Ave S',
    city: 'Richfield',
    state: 'MN',
    zipCode: '55423',
    country: 'USA',
    partnerType: 'retailer',
    uniqueIdentifier: 'RTL-BESTBUY-001',
    ...audit,
  },
  {
    id: 2,
    name: 'Goldie Group',
    address: '400 Refurb Way',
    city: 'Newark',
    state: 'NJ',
    zipCode: '07102',
    country: 'USA',
    partnerType: 'vendor',
    uniqueIdentifier: 'VND-GOLDIE-001',
    ...audit,
  },
  {
    id: 3,
    name: 'QuickCash Trading',
    address: '88 Circuit Ave',
    city: 'San Jose',
    state: 'CA',
    zipCode: '95112',
    country: 'USA',
    partnerType: 'vendor',
    uniqueIdentifier: 'VND-QUICKCASH-001',
    ...audit,
  },
];
export const PARTNER_BESTBUY_ID = 1;
export const PARTNER_GOLDIE_GROUP_ID = 2;
export const PARTNER_QUICKCASH_TRADING_ID = 3;

/** Table: partner_locations - FK: partnerId -> partners.id */
export const partnerLocations: PartnerLocation[] = [
  {
    id: 1,
    partnerId: PARTNER_BESTBUY_ID,
    name: 'BestBuy New York',
    address: '529 5th Ave',
    city: 'New York',
    state: 'NY',
    zipCode: '10017',
    country: 'USA',
    uniqueIdentifier: 'LOC-BESTBUY-NYC',
    ...audit,
  },
  {
    id: 2,
    partnerId: PARTNER_BESTBUY_ID,
    name: 'BestBuy Dallas',
    address: '11700 Preston Rd',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75230',
    country: 'USA',
    uniqueIdentifier: 'LOC-BESTBUY-DAL',
    ...audit,
  },
  {
    id: 3,
    partnerId: PARTNER_GOLDIE_GROUP_ID,
    name: 'Goldie Group Newark HQ',
    address: '400 Refurb Way',
    city: 'Newark',
    state: 'NJ',
    zipCode: '07102',
    country: 'USA',
    uniqueIdentifier: 'LOC-GOLDIE-HQ',
    ...audit,
  },
];
export const LOCATION_BESTBUY_NYC_ID = 1;
export const LOCATION_BESTBUY_DALLAS_ID = 2;
export const LOCATION_GOLDIE_NEWARK_HQ_ID = 3;

/**
 * Table: roles
 * `rights` are structured permission-key strings - a stand-in for real
 * authorization enforcement, which isn't wired up yet (see server/README.md).
 */
export const roles: Role[] = [
  {
    id: 1,
    name: 'Super Admin',
    rights: ['manage_partners', 'manage_locations', 'manage_users', 'manage_roles', 'view_reports'],
    ...audit,
  },
  {
    id: 2,
    name: 'Partner Admin',
    rights: ['manage_locations', 'manage_users', 'view_reports'],
    ...audit,
  },
  {
    id: 3,
    name: 'Vendor Admin',
    rights: ['manage_locations', 'manage_users', 'view_reports'],
    ...audit,
  },
  {
    id: 4,
    name: 'Promoter',
    rights: ['process_buyback'],
    ...audit,
  },
];
export const ROLE_SUPER_ADMIN_ID = 1;
export const ROLE_PARTNER_ADMIN_ID = 2;
export const ROLE_VENDOR_ADMIN_ID = 3;
export const ROLE_PROMOTER_ID = 4;

reserveIdRange('partners', partners.length);
reserveIdRange('partner_locations', partnerLocations.length);
reserveIdRange('roles', roles.length);
