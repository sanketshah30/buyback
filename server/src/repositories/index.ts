import { env } from '../config/env';
import { InMemoryAnswerTranslationRepository } from './inMemory/answerTranslation.repository';
import { InMemoryBuybackRepository } from './inMemory/buyback.repository';
import { InMemoryBuybackStatusHistoryRepository } from './inMemory/buybackStatusHistory.repository';
import { InMemoryBuybackVendorCalculationLogRepository } from './inMemory/buybackVendorCalculationLog.repository';
import { InMemoryCatalogRepository } from './inMemory/catalog.repository';
import { InMemoryDepreciationConfigRepository } from './inMemory/depreciationConfig.repository';
import { InMemoryDepreciationMatrixRepository } from './inMemory/depreciationMatrix.repository';
import { InMemoryMasterAnswerRepository } from './inMemory/masterAnswer.repository';
import { InMemoryMasterQuestionRepository } from './inMemory/masterQuestion.repository';
import { InMemoryOtpRepository } from './inMemory/otp.repository';
import { InMemoryPartnerRepository } from './inMemory/partner.repository';
import { InMemoryPartnerCategoryVendorMappingRepository } from './inMemory/partnerCategoryVendorMapping.repository';
import { InMemoryPartnerLocationRepository } from './inMemory/partnerLocation.repository';
import { InMemoryPartnerMarginConfigRepository } from './inMemory/partnerMarginConfig.repository';
import { InMemoryQuestionAnswerMappingRepository } from './inMemory/questionAnswerMapping.repository';
import { InMemoryQuestionTranslationRepository } from './inMemory/questionTranslation.repository';
import { InMemoryQuestionnaireConfigRepository } from './inMemory/questionnaireConfig.repository';
import { InMemoryRequestStatusMasterRepository } from './inMemory/requestStatusMaster.repository';
import { InMemoryRoleRepository } from './inMemory/role.repository';
import { InMemorySessionRepository } from './inMemory/session.repository';
import { InMemorySkuPricingRepository } from './inMemory/skuPricing.repository';
import { InMemoryUserRepository } from './inMemory/user.repository';
import { InMemoryUserLocationHistoryRepository } from './inMemory/userLocationHistory.repository';
import { InMemoryUserRoleRepository } from './inMemory/userRole.repository';
import { InMemoryVendorFeeConfigRepository } from './inMemory/vendorFeeConfig.repository';
import { PostgresAnswerTranslationRepository } from './postgres/answerTranslation.repository';
import { PostgresBuybackRepository } from './postgres/buyback.repository';
import { PostgresBuybackStatusHistoryRepository } from './postgres/buybackStatusHistory.repository';
import { PostgresBuybackVendorCalculationLogRepository } from './postgres/buybackVendorCalculationLog.repository';
import { PostgresCatalogRepository } from './postgres/catalog.repository';
import { PostgresDepreciationConfigRepository } from './postgres/depreciationConfig.repository';
import { PostgresDepreciationMatrixRepository } from './postgres/depreciationMatrix.repository';
import { PostgresMasterAnswerRepository } from './postgres/masterAnswer.repository';
import { PostgresMasterQuestionRepository } from './postgres/masterQuestion.repository';
import { PostgresOtpRepository } from './postgres/otp.repository';
import { PostgresPartnerRepository } from './postgres/partner.repository';
import { PostgresPartnerCategoryVendorMappingRepository } from './postgres/partnerCategoryVendorMapping.repository';
import { PostgresPartnerLocationRepository } from './postgres/partnerLocation.repository';
import { PostgresPartnerMarginConfigRepository } from './postgres/partnerMarginConfig.repository';
import { PostgresQuestionAnswerMappingRepository } from './postgres/questionAnswerMapping.repository';
import { PostgresQuestionTranslationRepository } from './postgres/questionTranslation.repository';
import { PostgresQuestionnaireConfigRepository } from './postgres/questionnaireConfig.repository';
import { PostgresRequestStatusMasterRepository } from './postgres/requestStatusMaster.repository';
import { PostgresRoleRepository } from './postgres/role.repository';
import { PostgresSessionRepository } from './postgres/session.repository';
import { PostgresSkuPricingRepository } from './postgres/skuPricing.repository';
import { PostgresUserRepository } from './postgres/user.repository';
import { PostgresUserLocationHistoryRepository } from './postgres/userLocationHistory.repository';
import { PostgresUserRoleRepository } from './postgres/userRole.repository';
import { PostgresVendorFeeConfigRepository } from './postgres/vendorFeeConfig.repository';
import {
  AnswerTranslationRepository,
  BuybackRepository,
  BuybackStatusHistoryRepository,
  BuybackVendorCalculationLogRepository,
  CatalogRepository,
  DepreciationConfigRepository,
  DepreciationMatrixRepository,
  MasterAnswerRepository,
  MasterQuestionRepository,
  OtpRepository,
  PartnerCategoryVendorMappingRepository,
  PartnerLocationRepository,
  PartnerMarginConfigRepository,
  PartnerRepository,
  QuestionAnswerMappingRepository,
  QuestionTranslationRepository,
  QuestionnaireConfigRepository,
  RequestStatusMasterRepository,
  RoleRepository,
  SessionRepository,
  SkuPricingRepository,
  UserLocationHistoryRepository,
  UserRepository,
  UserRoleRepository,
  VendorFeeConfigRepository,
} from './interfaces';

const usePostgres = env.dataDriver === 'postgres' || env.dataDriver === 'supabase';

if (usePostgres && !env.postgresUrl) {
  throw new Error(
    `DATA_DRIVER="${env.dataDriver}" requires POSTGRES_URL (or DATABASE_URL) to be set.`,
  );
}

function pick<T>(postgres: T, inMemory: T): T {
  return usePostgres ? postgres : inMemory;
}

export const userRepository: UserRepository = pick<UserRepository>(
  new PostgresUserRepository(),
  new InMemoryUserRepository(),
);
export const otpRepository: OtpRepository = pick<OtpRepository>(
  new PostgresOtpRepository(),
  new InMemoryOtpRepository(),
);
export const sessionRepository: SessionRepository = pick<SessionRepository>(
  new PostgresSessionRepository(),
  new InMemorySessionRepository(),
);
export const catalogRepository: CatalogRepository = pick<CatalogRepository>(
  new PostgresCatalogRepository(),
  new InMemoryCatalogRepository(),
);
export const buybackRepository: BuybackRepository = pick<BuybackRepository>(
  new PostgresBuybackRepository(),
  new InMemoryBuybackRepository(),
);
export const partnerRepository: PartnerRepository = pick<PartnerRepository>(
  new PostgresPartnerRepository(),
  new InMemoryPartnerRepository(),
);
export const partnerLocationRepository: PartnerLocationRepository = pick<PartnerLocationRepository>(
  new PostgresPartnerLocationRepository(),
  new InMemoryPartnerLocationRepository(),
);
export const roleRepository: RoleRepository = pick<RoleRepository>(
  new PostgresRoleRepository(),
  new InMemoryRoleRepository(),
);
export const userRoleRepository: UserRoleRepository = pick<UserRoleRepository>(
  new PostgresUserRoleRepository(),
  new InMemoryUserRoleRepository(),
);
export const userLocationHistoryRepository: UserLocationHistoryRepository = pick<UserLocationHistoryRepository>(
  new PostgresUserLocationHistoryRepository(),
  new InMemoryUserLocationHistoryRepository(),
);
export const masterQuestionRepository: MasterQuestionRepository = pick<MasterQuestionRepository>(
  new PostgresMasterQuestionRepository(),
  new InMemoryMasterQuestionRepository(),
);
export const questionTranslationRepository: QuestionTranslationRepository = pick<QuestionTranslationRepository>(
  new PostgresQuestionTranslationRepository(),
  new InMemoryQuestionTranslationRepository(),
);
export const masterAnswerRepository: MasterAnswerRepository = pick<MasterAnswerRepository>(
  new PostgresMasterAnswerRepository(),
  new InMemoryMasterAnswerRepository(),
);
export const answerTranslationRepository: AnswerTranslationRepository = pick<AnswerTranslationRepository>(
  new PostgresAnswerTranslationRepository(),
  new InMemoryAnswerTranslationRepository(),
);
export const questionAnswerMappingRepository: QuestionAnswerMappingRepository = pick<QuestionAnswerMappingRepository>(
  new PostgresQuestionAnswerMappingRepository(),
  new InMemoryQuestionAnswerMappingRepository(),
);
export const questionnaireConfigRepository: QuestionnaireConfigRepository = pick<QuestionnaireConfigRepository>(
  new PostgresQuestionnaireConfigRepository(),
  new InMemoryQuestionnaireConfigRepository(),
);
export const partnerCategoryVendorMappingRepository: PartnerCategoryVendorMappingRepository =
  pick<PartnerCategoryVendorMappingRepository>(
    new PostgresPartnerCategoryVendorMappingRepository(),
    new InMemoryPartnerCategoryVendorMappingRepository(),
  );
export const skuPricingRepository: SkuPricingRepository = pick<SkuPricingRepository>(
  new PostgresSkuPricingRepository(),
  new InMemorySkuPricingRepository(),
);
export const depreciationConfigRepository: DepreciationConfigRepository = pick<DepreciationConfigRepository>(
  new PostgresDepreciationConfigRepository(),
  new InMemoryDepreciationConfigRepository(),
);
export const depreciationMatrixRepository: DepreciationMatrixRepository = pick<DepreciationMatrixRepository>(
  new PostgresDepreciationMatrixRepository(),
  new InMemoryDepreciationMatrixRepository(),
);
export const requestStatusMasterRepository: RequestStatusMasterRepository = pick<RequestStatusMasterRepository>(
  new PostgresRequestStatusMasterRepository(),
  new InMemoryRequestStatusMasterRepository(),
);
export const buybackStatusHistoryRepository: BuybackStatusHistoryRepository = pick<BuybackStatusHistoryRepository>(
  new PostgresBuybackStatusHistoryRepository(),
  new InMemoryBuybackStatusHistoryRepository(),
);
export const buybackVendorCalculationLogRepository: BuybackVendorCalculationLogRepository =
  pick<BuybackVendorCalculationLogRepository>(
    new PostgresBuybackVendorCalculationLogRepository(),
    new InMemoryBuybackVendorCalculationLogRepository(),
  );
export const partnerMarginConfigRepository: PartnerMarginConfigRepository = pick<PartnerMarginConfigRepository>(
  new PostgresPartnerMarginConfigRepository(),
  new InMemoryPartnerMarginConfigRepository(),
);
export const vendorFeeConfigRepository: VendorFeeConfigRepository = pick<VendorFeeConfigRepository>(
  new PostgresVendorFeeConfigRepository(),
  new InMemoryVendorFeeConfigRepository(),
);
