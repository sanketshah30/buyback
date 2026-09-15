import { products, skuAliases, skus } from '../../data/catalog.seed';
import { partnerLocations, partners, roles } from '../../data/partner.seed';
import {
  answerTranslations,
  masterAnswers,
  masterQuestions,
  questionAnswerMappings,
  questionTranslations,
  questionnaireConfigs,
} from '../../data/questionnaireConfig.seed';
import {
  AnswerTranslation,
  BuybackRequest,
  MasterAnswer,
  MasterQuestion,
  OtpChallenge,
  Partner,
  PartnerLocation,
  Product,
  QuestionAnswerMapping,
  QuestionTranslation,
  QuestionnaireConfig,
  Role,
  Sku,
  SkuAlias,
  User,
  UserLocationHistory,
  UserRole,
} from '../../types/domain';
import { addToIndex, Index } from './indexUtils';

/**
 * A single process-memory "database". Data resets whenever the server
 * restarts - this is intentional for the MVP. Replace this module with a
 * MySQL connection pool (e.g. `mysql2/promise`) when persistence is needed.
 *
 * Every table's primary Map is keyed by its integer primary key (the
 * equivalent of a clustered index on the PK). Alongside each, `indexes`
 * below maintains secondary indexes for every foreign key / frequently
 * filtered column, matching what a real `CREATE INDEX` statement would
 * define once this moves to MySQL - see server/README.md for the full list.
 *
 * Partner/location/role/questionnaire-config tables are seeded but fully
 * mutable (unlike the read-only product catalog) since onboarding new
 * partners/locations/roles/questions is a first-class feature of those
 * modules.
 */
export const tables = {
  users: new Map<number, User>(),
  otpChallenges: new Map<string, OtpChallenge>(), // keyed by the opaque requestId, not an integer PK - see OtpChallenge doc comment
  buybackRequests: new Map<number, BuybackRequest>(),
  dailySequences: new Map<string, number>(), // dateKey -> last count (business display-ID counter, not a table)

  products: new Map<number, Product>(products.map((p) => [p.id, p])),
  skus: new Map<number, Sku>(skus.map((s) => [s.id, s])),
  skuAliases: new Map<number, SkuAlias>(skuAliases.map((a) => [a.id, a])),

  partners: new Map<number, Partner>(partners.map((p) => [p.id, p])),
  partnerLocations: new Map<number, PartnerLocation>(partnerLocations.map((l) => [l.id, l])),
  roles: new Map<number, Role>(roles.map((r) => [r.id, r])),
  userRoles: new Map<number, UserRole>(),
  userLocationHistory: new Map<number, UserLocationHistory>(),

  masterQuestions: new Map<number, MasterQuestion>(masterQuestions.map((q) => [q.id, q])),
  questionTranslations: new Map<number, QuestionTranslation>(questionTranslations.map((t) => [t.id, t])),
  masterAnswers: new Map<number, MasterAnswer>(masterAnswers.map((a) => [a.id, a])),
  answerTranslations: new Map<number, AnswerTranslation>(answerTranslations.map((t) => [t.id, t])),
  questionAnswerMappings: new Map<number, QuestionAnswerMapping>(questionAnswerMappings.map((m) => [m.id, m])),
  questionnaireConfigs: new Map<number, QuestionnaireConfig>(questionnaireConfigs.map((c) => [c.id, c])),
};

/** Secondary indexes - see the module doc comment above. */
export const indexes = {
  usersByMobile: new Map<string, number>(), // unique index
  usersByPartnerLocationId: new Map<number, Set<number>>() as Index<number>,
  buybackRequestsByUserId: new Map<number, Set<number>>() as Index<number>,

  partnerLocationsByPartnerId: new Map<number, Set<number>>() as Index<number>,
  userRolesByUserId: new Map<number, Set<number>>() as Index<number>,
  userLocationHistoryByUserId: new Map<number, Set<number>>() as Index<number>,

  productsByCategoryAndBrand: new Map<string, Set<number>>() as Index<string>,
  productsByCategory: new Map<number, Set<number>>() as Index<number>,
  skusByProductId: new Map<number, Set<number>>() as Index<number>,
  skuAliasesBySkuId: new Map<number, Set<number>>() as Index<number>,

  questionTranslationsByQuestionId: new Map<number, Set<number>>() as Index<number>,
  answerTranslationsByAnswerId: new Map<number, Set<number>>() as Index<number>,
  questionAnswerMappingsByQuestionId: new Map<number, Set<number>>() as Index<number>,
  // Composite index matching exactly how QuestionnaireConfigRepository.resolve() queries: `${categoryId}:${brandId ?? 'null'}:${partnerId ?? 'null'}`
  questionnaireConfigsByProfile: new Map<string, Set<number>>() as Index<string>,
  questionnaireConfigsByCategory: new Map<number, Set<number>>() as Index<number>,
};

export function profileKey(categoryId: number, brandId: number | null, partnerId: number | null): string {
  return `${categoryId}:${brandId ?? 'null'}:${partnerId ?? 'null'}`;
}

// Populate indexes for seeded rows (rows created later via the API maintain
// these incrementally in their respective repository's create/update methods).
for (const location of partnerLocations) {
  addToIndex(indexes.partnerLocationsByPartnerId, location.partnerId, location.id);
}
for (const translation of questionTranslations) {
  addToIndex(indexes.questionTranslationsByQuestionId, translation.questionId, translation.id);
}
for (const translation of answerTranslations) {
  addToIndex(indexes.answerTranslationsByAnswerId, translation.answerId, translation.id);
}
for (const mapping of questionAnswerMappings) {
  addToIndex(indexes.questionAnswerMappingsByQuestionId, mapping.questionId, mapping.id);
}
for (const config of questionnaireConfigs) {
  addToIndex(indexes.questionnaireConfigsByProfile, profileKey(config.productCategoryId, config.brandId, config.partnerId), config.id);
  addToIndex(indexes.questionnaireConfigsByCategory, config.productCategoryId, config.id);
}
for (const product of products) {
  addToIndex(indexes.productsByCategory, product.categoryId, product.id);
  addToIndex(indexes.productsByCategoryAndBrand, `${product.categoryId}:${product.brandId}`, product.id);
}
for (const sku of skus) {
  addToIndex(indexes.skusByProductId, sku.productId, sku.id);
}
for (const alias of skuAliases) {
  addToIndex(indexes.skuAliasesBySkuId, alias.skuId, alias.id);
}
