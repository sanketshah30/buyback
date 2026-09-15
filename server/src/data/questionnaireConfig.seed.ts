import {
  AnswerTranslation,
  MasterAnswer,
  MasterQuestion,
  QuestionAnswerMapping,
  QuestionTranslation,
  QuestionnaireConfig,
} from '../types/domain';
import { reserveIdRange } from '../utils/idGenerator';
import { BRAND_APPLE_ID, CATEGORY_SMARTPHONE_ID } from './catalog.seed';
import { PARTNER_BESTBUY_ID, PARTNER_GOLDIE_GROUP_ID } from './partner.seed';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/**
 * Demo data reproduces the exact worked example from the spec, using real
 * IDs from the catalog/partner-onboarding modules:
 *   Category = "Smartphones" (always required, exact match)
 *   Brand    = "Apple"       (stands in for "Brand 4")
 *   Partner  = "BestBuy"     (stands in for "Partner 3")
 * Tier 2 (wildcard brand + exact partner) is also seeded - the spec's 3
 * worked examples never demonstrated that tier, but it's needed to exercise
 * the "partner-specificity beats brand-specificity" precedence rule.
 */

/** Table: questions */
export const masterQuestions: MasterQuestion[] = [
  { id: 1, type: 'single-choice', ...audit }, // screen cracked
  { id: 2, type: 'single-choice', ...audit }, // powers on
  { id: 3, type: 'single-choice', ...audit }, // liquid damage
  { id: 4, type: 'single-choice', ...audit }, // cosmetic condition
];
const QUESTION_SCREEN_CRACKED_ID = 1;
const QUESTION_POWERS_ON_ID = 2;
const QUESTION_LIQUID_DAMAGE_ID = 3;
const QUESTION_COSMETIC_CONDITION_ID = 4;

/** Table: question_translations - FK: questionId -> questions.id */
export const questionTranslations: QuestionTranslation[] = [
  { id: 1, questionId: QUESTION_SCREEN_CRACKED_ID, language: 'en', text: 'Is the screen cracked?', ...audit },
  { id: 2, questionId: QUESTION_SCREEN_CRACKED_ID, language: 'es', text: '¿Está agrietada la pantalla?', ...audit },
  { id: 3, questionId: QUESTION_POWERS_ON_ID, language: 'en', text: 'Does the device power on normally?', ...audit },
  { id: 4, questionId: QUESTION_LIQUID_DAMAGE_ID, language: 'en', text: 'Is the liquid damage indicator triggered?', ...audit },
  { id: 5, questionId: QUESTION_COSMETIC_CONDITION_ID, language: 'en', text: 'What is the overall cosmetic condition?', ...audit },
];

/** Table: answers - `code` is the stable, language-independent reference key */
export const masterAnswers: MasterAnswer[] = [
  { id: 1, code: 'yes', ...audit },
  { id: 2, code: 'no', ...audit },
  { id: 3, code: 'excellent', ...audit },
  { id: 4, code: 'good', ...audit },
  { id: 5, code: 'fair', ...audit },
  { id: 6, code: 'poor', ...audit },
];
const ANSWER_YES_ID = 1;
const ANSWER_NO_ID = 2;
const ANSWER_EXCELLENT_ID = 3;
const ANSWER_GOOD_ID = 4;
const ANSWER_FAIR_ID = 5;
const ANSWER_POOR_ID = 6;

/** Table: answer_translations - FK: answerId -> answers.id */
export const answerTranslations: AnswerTranslation[] = [
  { id: 1, answerId: ANSWER_YES_ID, language: 'en', text: 'Yes', ...audit },
  { id: 2, answerId: ANSWER_YES_ID, language: 'es', text: 'Sí', ...audit },
  { id: 3, answerId: ANSWER_NO_ID, language: 'en', text: 'No', ...audit },
  { id: 4, answerId: ANSWER_NO_ID, language: 'es', text: 'No', ...audit },
  { id: 5, answerId: ANSWER_EXCELLENT_ID, language: 'en', text: 'Excellent', ...audit },
  { id: 6, answerId: ANSWER_GOOD_ID, language: 'en', text: 'Good', ...audit },
  { id: 7, answerId: ANSWER_FAIR_ID, language: 'en', text: 'Fair', ...audit },
  { id: 8, answerId: ANSWER_POOR_ID, language: 'en', text: 'Poor', ...audit },
];

/** Table: question_answer_mapping - "this Answer is a valid option for this Question" */
export const questionAnswerMappings: QuestionAnswerMapping[] = [
  { id: 1, questionId: QUESTION_SCREEN_CRACKED_ID, answerId: ANSWER_YES_ID, ...audit },
  { id: 2, questionId: QUESTION_SCREEN_CRACKED_ID, answerId: ANSWER_NO_ID, ...audit },
  { id: 3, questionId: QUESTION_POWERS_ON_ID, answerId: ANSWER_YES_ID, ...audit },
  { id: 4, questionId: QUESTION_POWERS_ON_ID, answerId: ANSWER_NO_ID, ...audit },
  { id: 5, questionId: QUESTION_LIQUID_DAMAGE_ID, answerId: ANSWER_YES_ID, ...audit },
  { id: 6, questionId: QUESTION_LIQUID_DAMAGE_ID, answerId: ANSWER_NO_ID, ...audit },
  { id: 7, questionId: QUESTION_COSMETIC_CONDITION_ID, answerId: ANSWER_EXCELLENT_ID, ...audit },
  { id: 8, questionId: QUESTION_COSMETIC_CONDITION_ID, answerId: ANSWER_GOOD_ID, ...audit },
  { id: 9, questionId: QUESTION_COSMETIC_CONDITION_ID, answerId: ANSWER_FAIR_ID, ...audit },
  { id: 10, questionId: QUESTION_COSMETIC_CONDITION_ID, answerId: ANSWER_POOR_ID, ...audit },
];
const QAM_SCREEN_CRACKED_YES = 1;
const QAM_SCREEN_CRACKED_NO = 2;
const QAM_POWERS_ON_YES = 3;
const QAM_POWERS_ON_NO = 4;
const QAM_LIQUID_DAMAGE_YES = 5;
const QAM_LIQUID_DAMAGE_NO = 6;
const QAM_COSMETIC_EXCELLENT = 7;
const QAM_COSMETIC_GOOD = 8;
const QAM_COSMETIC_FAIR = 9;
const QAM_COSMETIC_POOR = 10;

/**
 * Table: questionnaire_config
 * Tier 1 (brand exact + partner exact)   -> "Is the screen cracked?"
 * Tier 2 (brand wildcard + partner exact) -> "Is the liquid damage indicator triggered?"
 * Tier 3 (brand exact + partner wildcard) -> "Does the device power on normally?"
 * Tier 4 (brand wildcard + partner wildcard, generic fallback) -> "What is the overall cosmetic condition?"
 */
export const questionnaireConfigs: QuestionnaireConfig[] = [
  // Tier 1: Smartphones + Apple + BestBuy
  { id: 1, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_APPLE_ID, partnerId: PARTNER_BESTBUY_ID, questionAnswerId: QAM_SCREEN_CRACKED_YES, sequence: 1, ...audit },
  { id: 2, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_APPLE_ID, partnerId: PARTNER_BESTBUY_ID, questionAnswerId: QAM_SCREEN_CRACKED_NO, sequence: 1, ...audit },

  // Tier 3: Smartphones + Apple + partner=null (wildcard)
  { id: 3, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_APPLE_ID, partnerId: null, questionAnswerId: QAM_POWERS_ON_YES, sequence: 1, ...audit },
  { id: 4, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: BRAND_APPLE_ID, partnerId: null, questionAnswerId: QAM_POWERS_ON_NO, sequence: 1, ...audit },

  // Tier 2: Smartphones + brand=null (wildcard) + Goldie Group
  { id: 5, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: null, partnerId: PARTNER_GOLDIE_GROUP_ID, questionAnswerId: QAM_LIQUID_DAMAGE_YES, sequence: 1, ...audit },
  { id: 6, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: null, partnerId: PARTNER_GOLDIE_GROUP_ID, questionAnswerId: QAM_LIQUID_DAMAGE_NO, sequence: 1, ...audit },

  // Tier 4: Smartphones + brand=null + partner=null (generic fallback)
  { id: 7, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: null, partnerId: null, questionAnswerId: QAM_COSMETIC_EXCELLENT, sequence: 1, ...audit },
  { id: 8, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: null, partnerId: null, questionAnswerId: QAM_COSMETIC_GOOD, sequence: 1, ...audit },
  { id: 9, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: null, partnerId: null, questionAnswerId: QAM_COSMETIC_FAIR, sequence: 1, ...audit },
  { id: 10, productCategoryId: CATEGORY_SMARTPHONE_ID, brandId: null, partnerId: null, questionAnswerId: QAM_COSMETIC_POOR, sequence: 1, ...audit },
];

reserveIdRange('questions', masterQuestions.length);
reserveIdRange('question_translations', questionTranslations.length);
reserveIdRange('answers', masterAnswers.length);
reserveIdRange('answer_translations', answerTranslations.length);
reserveIdRange('question_answer_mapping', questionAnswerMappings.length);
reserveIdRange('questionnaire_config', questionnaireConfigs.length);
