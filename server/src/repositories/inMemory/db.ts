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
  QuestionAnswerMapping,
  QuestionTranslation,
  QuestionnaireConfig,
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
 * Partner/location/role/questionnaire-config tables are seeded but fully
 * mutable (unlike the read-only product catalog) since onboarding new
 * partners/locations/roles/questions is a first-class feature of those
 * modules.
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

  masterQuestions: new Map<string, MasterQuestion>(masterQuestions.map((q) => [q.id, q])),
  questionTranslations: new Map<string, QuestionTranslation>(questionTranslations.map((t) => [t.id, t])),
  masterAnswers: new Map<string, MasterAnswer>(masterAnswers.map((a) => [a.id, a])),
  answerTranslations: new Map<string, AnswerTranslation>(answerTranslations.map((t) => [t.id, t])),
  questionAnswerMappings: new Map<string, QuestionAnswerMapping>(questionAnswerMappings.map((m) => [m.id, m])),
  questionnaireConfigs: new Map<string, QuestionnaireConfig>(questionnaireConfigs.map((c) => [c.id, c])),
};
