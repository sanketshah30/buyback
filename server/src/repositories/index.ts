import { env } from '../config/env';
import { InMemoryAnswerTranslationRepository } from './inMemory/answerTranslation.repository';
import { InMemoryBuybackRepository } from './inMemory/buyback.repository';
import { InMemoryCatalogRepository } from './inMemory/catalog.repository';
import { InMemoryMasterAnswerRepository } from './inMemory/masterAnswer.repository';
import { InMemoryMasterQuestionRepository } from './inMemory/masterQuestion.repository';
import { InMemoryOtpRepository } from './inMemory/otp.repository';
import { InMemoryPartnerRepository } from './inMemory/partner.repository';
import { InMemoryPartnerCategoryVendorMappingRepository } from './inMemory/partnerCategoryVendorMapping.repository';
import { InMemoryPartnerLocationRepository } from './inMemory/partnerLocation.repository';
import { InMemoryQuestionAnswerMappingRepository } from './inMemory/questionAnswerMapping.repository';
import { InMemoryQuestionTranslationRepository } from './inMemory/questionTranslation.repository';
import { InMemoryQuestionnaireConfigRepository } from './inMemory/questionnaireConfig.repository';
import { InMemoryRoleRepository } from './inMemory/role.repository';
import { InMemorySessionRepository } from './inMemory/session.repository';
import { InMemorySkuPricingRepository } from './inMemory/skuPricing.repository';
import { InMemoryUserRepository } from './inMemory/user.repository';
import { InMemoryUserLocationHistoryRepository } from './inMemory/userLocationHistory.repository';
import { InMemoryUserRoleRepository } from './inMemory/userRole.repository';
import {
  AnswerTranslationRepository,
  BuybackRepository,
  CatalogRepository,
  MasterAnswerRepository,
  MasterQuestionRepository,
  OtpRepository,
  PartnerCategoryVendorMappingRepository,
  PartnerLocationRepository,
  PartnerRepository,
  QuestionAnswerMappingRepository,
  QuestionTranslationRepository,
  QuestionnaireConfigRepository,
  RoleRepository,
  SessionRepository,
  SkuPricingRepository,
  UserLocationHistoryRepository,
  UserRepository,
  UserRoleRepository,
} from './interfaces';

/**
 * Central place to select the active data driver.
 *
 * Today `DATA_DRIVER=in-memory` is the only supported value. When MySQL
 * support is added, branch on `env.dataDriver === 'mysql'` here and return
 * MySQL-backed implementations of the same interfaces - callers never need
 * to change.
 */
function assertSupportedDriver() {
  if (env.dataDriver !== 'in-memory') {
    // eslint-disable-next-line no-console
    console.warn(
      `[repositories] DATA_DRIVER="${env.dataDriver}" is not implemented yet, falling back to in-memory mock data.`,
    );
  }
}

assertSupportedDriver();

export const userRepository: UserRepository = new InMemoryUserRepository();
export const otpRepository: OtpRepository = new InMemoryOtpRepository();
export const sessionRepository: SessionRepository = new InMemorySessionRepository();
export const catalogRepository: CatalogRepository = new InMemoryCatalogRepository();
export const buybackRepository: BuybackRepository = new InMemoryBuybackRepository();
export const partnerRepository: PartnerRepository = new InMemoryPartnerRepository();
export const partnerLocationRepository: PartnerLocationRepository = new InMemoryPartnerLocationRepository();
export const roleRepository: RoleRepository = new InMemoryRoleRepository();
export const userRoleRepository: UserRoleRepository = new InMemoryUserRoleRepository();
export const userLocationHistoryRepository: UserLocationHistoryRepository = new InMemoryUserLocationHistoryRepository();
export const masterQuestionRepository: MasterQuestionRepository = new InMemoryMasterQuestionRepository();
export const questionTranslationRepository: QuestionTranslationRepository = new InMemoryQuestionTranslationRepository();
export const masterAnswerRepository: MasterAnswerRepository = new InMemoryMasterAnswerRepository();
export const answerTranslationRepository: AnswerTranslationRepository = new InMemoryAnswerTranslationRepository();
export const questionAnswerMappingRepository: QuestionAnswerMappingRepository = new InMemoryQuestionAnswerMappingRepository();
export const questionnaireConfigRepository: QuestionnaireConfigRepository = new InMemoryQuestionnaireConfigRepository();
export const partnerCategoryVendorMappingRepository: PartnerCategoryVendorMappingRepository = new InMemoryPartnerCategoryVendorMappingRepository();
export const skuPricingRepository: SkuPricingRepository = new InMemorySkuPricingRepository();
