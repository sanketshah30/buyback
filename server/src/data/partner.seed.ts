import { Partner, PartnerLocation, Role } from '../types/domain';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/** Table: partners */
export const partners: Partner[] = [
  {
    id: 'partner-bestbuy',
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
    id: 'partner-goldie-group',
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
];

/** Table: partner_locations - FK: partnerId -> partners.id */
export const partnerLocations: PartnerLocation[] = [
  {
    id: 'location-bestbuy-nyc',
    partnerId: 'partner-bestbuy',
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
    id: 'location-bestbuy-dallas',
    partnerId: 'partner-bestbuy',
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
    id: 'location-goldie-newark-hq',
    partnerId: 'partner-goldie-group',
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

/**
 * Table: roles
 * `rights` are structured permission-key strings - a stand-in for real
 * authorization enforcement, which isn't wired up yet (see server/README.md).
 */
export const roles: Role[] = [
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    rights: ['manage_partners', 'manage_locations', 'manage_users', 'manage_roles', 'view_reports'],
    ...audit,
  },
  {
    id: 'role-partner-admin',
    name: 'Partner Admin',
    rights: ['manage_locations', 'manage_users', 'view_reports'],
    ...audit,
  },
  {
    id: 'role-vendor-admin',
    name: 'Vendor Admin',
    rights: ['manage_locations', 'manage_users', 'view_reports'],
    ...audit,
  },
  {
    id: 'role-promoter',
    name: 'Promoter',
    rights: ['process_buyback'],
    ...audit,
  },
];
