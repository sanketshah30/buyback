import { DepreciationConfig, DepreciationMatrixEntry } from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';
import { BRAND_APPLE_ID, CATEGORY_SMARTPHONE_ID } from './catalog.seed';
import { PARTNER_GOLDIE_GROUP_ID } from './partner.seed';
import { DEMO_PROMOTER_USER_ID } from './user.seed';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

// QuestionAnswerMapping IDs, reused from questionnaireConfig.seed.ts:
// 1 = screen cracked: yes, 2 = screen cracked: no
// 3 = powers on: yes, 4 = powers on: no
// 5 = liquid damage: yes, 6 = liquid damage: no
// 7-10 = cosmetic condition: excellent/good/fair/poor

/**
 * Table: depreciation_config
 * Two sets for Smartphones + Apple: one specific to Goldie Group (a
 * vendor may negotiate steeper/shallower deductions than the default), and
 * one wildcard (vendorId: null) applying to every other vendor - exercising
 * both the required exact-match (category, brand) and the vendorId
 * wildcard together.
 */
export const depreciationConfigs: DepreciationConfig[] = [
  { id: 1, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_APPLE_ID, vendorId: PARTNER_GOLDIE_GROUP_ID, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit },
  { id: 2, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_APPLE_ID, vendorId: null, validFrom: SEEDED_AT, uploadedById: DEMO_PROMOTER_USER_ID, ...audit },
];
export const DEPRECIATION_CONFIG_SMARTPHONE_APPLE_GOLDIE_ID = 1;
export const DEPRECIATION_CONFIG_SMARTPHONE_APPLE_ANY_VENDOR_ID = 2;

/** Table: depreciation_matrix - one row per question-answer within a config set. */
export const depreciationMatrix: DepreciationMatrixEntry[] = [
  // Goldie Group's own Smartphones+Apple deductions
  { id: 1, depreciationConfigId: DEPRECIATION_CONFIG_SMARTPHONE_APPLE_GOLDIE_ID, questionAnswerId: 1, depreciationType: 'percentage', depreciationValue: 15, ...audit }, // screen cracked: yes
  { id: 2, depreciationConfigId: DEPRECIATION_CONFIG_SMARTPHONE_APPLE_GOLDIE_ID, questionAnswerId: 4, depreciationType: 'percentage', depreciationValue: 70, ...audit }, // powers on: no
  { id: 3, depreciationConfigId: DEPRECIATION_CONFIG_SMARTPHONE_APPLE_GOLDIE_ID, questionAnswerId: 5, depreciationType: 'absolute', depreciationValue: 5000, ...audit }, // liquid damage: yes
  { id: 4, depreciationConfigId: DEPRECIATION_CONFIG_SMARTPHONE_APPLE_GOLDIE_ID, questionAnswerId: 9, depreciationType: 'percentage', depreciationValue: 10, ...audit }, // cosmetic: fair
  { id: 5, depreciationConfigId: DEPRECIATION_CONFIG_SMARTPHONE_APPLE_GOLDIE_ID, questionAnswerId: 10, depreciationType: 'percentage', depreciationValue: 20, ...audit }, // cosmetic: poor

  // Generic (any other vendor) Smartphones+Apple deductions
  { id: 6, depreciationConfigId: DEPRECIATION_CONFIG_SMARTPHONE_APPLE_ANY_VENDOR_ID, questionAnswerId: 1, depreciationType: 'percentage', depreciationValue: 15, ...audit }, // screen cracked: yes
  { id: 7, depreciationConfigId: DEPRECIATION_CONFIG_SMARTPHONE_APPLE_ANY_VENDOR_ID, questionAnswerId: 4, depreciationType: 'percentage', depreciationValue: 70, ...audit }, // powers on: no
  { id: 8, depreciationConfigId: DEPRECIATION_CONFIG_SMARTPHONE_APPLE_ANY_VENDOR_ID, questionAnswerId: 5, depreciationType: 'absolute', depreciationValue: 4000, ...audit }, // liquid damage: yes
];

reserveIdRange('depreciation_config', depreciationConfigs.length);
reserveIdRange('depreciation_matrix', depreciationMatrix.length);
