import {
  AnswerTranslation,
  MasterAnswer,
  MasterQuestion,
  QuestionAnswerMapping,
  QuestionTranslation,
  QuestionnaireConfig,
} from '../types/domain';

const SEEDED_AT = '2026-01-01T00:00:00.000Z';
const audit = { createdAt: SEEDED_AT, updatedAt: SEEDED_AT, isActive: true };

/**
 * Demo data reproduces the exact worked example from the spec, using real
 * IDs from the catalog/partner-onboarding modules:
 *   Category = cat-smartphone (always required, exact match)
 *   Brand    = brand-apple    (stands in for "Brand 4")
 *   Partner  = partner-bestbuy (stands in for "Partner 3")
 * Tier 2 (wildcard brand + exact partner) is also seeded - the spec's 3
 * worked examples never demonstrated that tier, but it's needed to exercise
 * the "partner-specificity beats brand-specificity" precedence rule.
 */

/** Table: questions */
export const masterQuestions: MasterQuestion[] = [
  { id: 'question-screen-cracked', type: 'single-choice', ...audit },
  { id: 'question-powers-on', type: 'single-choice', ...audit },
  { id: 'question-liquid-damage', type: 'single-choice', ...audit },
  { id: 'question-cosmetic-condition', type: 'single-choice', ...audit },
];

/** Table: question_translations - FK: questionId -> questions.id */
export const questionTranslations: QuestionTranslation[] = [
  { id: 'qt-screen-cracked-en', questionId: 'question-screen-cracked', language: 'en', text: 'Is the screen cracked?', ...audit },
  { id: 'qt-screen-cracked-es', questionId: 'question-screen-cracked', language: 'es', text: '¿Está agrietada la pantalla?', ...audit },
  { id: 'qt-powers-on-en', questionId: 'question-powers-on', language: 'en', text: 'Does the device power on normally?', ...audit },
  { id: 'qt-liquid-damage-en', questionId: 'question-liquid-damage', language: 'en', text: 'Is the liquid damage indicator triggered?', ...audit },
  { id: 'qt-cosmetic-condition-en', questionId: 'question-cosmetic-condition', language: 'en', text: 'What is the overall cosmetic condition?', ...audit },
];

/** Table: answers - `code` is the stable, language-independent reference key */
export const masterAnswers: MasterAnswer[] = [
  { id: 'answer-yes', code: 'yes', ...audit },
  { id: 'answer-no', code: 'no', ...audit },
  { id: 'answer-excellent', code: 'excellent', ...audit },
  { id: 'answer-good', code: 'good', ...audit },
  { id: 'answer-fair', code: 'fair', ...audit },
  { id: 'answer-poor', code: 'poor', ...audit },
];

/** Table: answer_translations - FK: answerId -> answers.id */
export const answerTranslations: AnswerTranslation[] = [
  { id: 'at-yes-en', answerId: 'answer-yes', language: 'en', text: 'Yes', ...audit },
  { id: 'at-yes-es', answerId: 'answer-yes', language: 'es', text: 'Sí', ...audit },
  { id: 'at-no-en', answerId: 'answer-no', language: 'en', text: 'No', ...audit },
  { id: 'at-no-es', answerId: 'answer-no', language: 'es', text: 'No', ...audit },
  { id: 'at-excellent-en', answerId: 'answer-excellent', language: 'en', text: 'Excellent', ...audit },
  { id: 'at-good-en', answerId: 'answer-good', language: 'en', text: 'Good', ...audit },
  { id: 'at-fair-en', answerId: 'answer-fair', language: 'en', text: 'Fair', ...audit },
  { id: 'at-poor-en', answerId: 'answer-poor', language: 'en', text: 'Poor', ...audit },
];

/** Table: question_answer_mapping - "this Answer is a valid option for this Question" */
export const questionAnswerMappings: QuestionAnswerMapping[] = [
  { id: 'qam-screen-cracked-yes', questionId: 'question-screen-cracked', answerId: 'answer-yes', ...audit },
  { id: 'qam-screen-cracked-no', questionId: 'question-screen-cracked', answerId: 'answer-no', ...audit },
  { id: 'qam-powers-on-yes', questionId: 'question-powers-on', answerId: 'answer-yes', ...audit },
  { id: 'qam-powers-on-no', questionId: 'question-powers-on', answerId: 'answer-no', ...audit },
  { id: 'qam-liquid-damage-yes', questionId: 'question-liquid-damage', answerId: 'answer-yes', ...audit },
  { id: 'qam-liquid-damage-no', questionId: 'question-liquid-damage', answerId: 'answer-no', ...audit },
  { id: 'qam-cosmetic-excellent', questionId: 'question-cosmetic-condition', answerId: 'answer-excellent', ...audit },
  { id: 'qam-cosmetic-good', questionId: 'question-cosmetic-condition', answerId: 'answer-good', ...audit },
  { id: 'qam-cosmetic-fair', questionId: 'question-cosmetic-condition', answerId: 'answer-fair', ...audit },
  { id: 'qam-cosmetic-poor', questionId: 'question-cosmetic-condition', answerId: 'answer-poor', ...audit },
];

/**
 * Table: questionnaire_config
 * Tier 1 (brand exact + partner exact)   -> question-screen-cracked
 * Tier 2 (brand wildcard + partner exact) -> question-liquid-damage
 * Tier 3 (brand exact + partner wildcard) -> question-powers-on
 * Tier 4 (brand wildcard + partner wildcard, generic fallback) -> question-cosmetic-condition
 */
export const questionnaireConfigs: QuestionnaireConfig[] = [
  // Tier 1: cat-smartphone + brand-apple + partner-bestbuy
  { id: 'qc-1-yes', productCategoryId: 'cat-smartphone', brandId: 'brand-apple', partnerId: 'partner-bestbuy', questionAnswerId: 'qam-screen-cracked-yes', sequence: 1, ...audit },
  { id: 'qc-1-no', productCategoryId: 'cat-smartphone', brandId: 'brand-apple', partnerId: 'partner-bestbuy', questionAnswerId: 'qam-screen-cracked-no', sequence: 1, ...audit },

  // Tier 3: cat-smartphone + brand-apple + partner=null (wildcard)
  { id: 'qc-3-yes', productCategoryId: 'cat-smartphone', brandId: 'brand-apple', partnerId: null, questionAnswerId: 'qam-powers-on-yes', sequence: 1, ...audit },
  { id: 'qc-3-no', productCategoryId: 'cat-smartphone', brandId: 'brand-apple', partnerId: null, questionAnswerId: 'qam-powers-on-no', sequence: 1, ...audit },

  // Tier 2: cat-smartphone + brand=null (wildcard) + partner-goldie-group
  { id: 'qc-2-yes', productCategoryId: 'cat-smartphone', brandId: null, partnerId: 'partner-goldie-group', questionAnswerId: 'qam-liquid-damage-yes', sequence: 1, ...audit },
  { id: 'qc-2-no', productCategoryId: 'cat-smartphone', brandId: null, partnerId: 'partner-goldie-group', questionAnswerId: 'qam-liquid-damage-no', sequence: 1, ...audit },

  // Tier 4: cat-smartphone + brand=null + partner=null (generic fallback)
  { id: 'qc-4-excellent', productCategoryId: 'cat-smartphone', brandId: null, partnerId: null, questionAnswerId: 'qam-cosmetic-excellent', sequence: 1, ...audit },
  { id: 'qc-4-good', productCategoryId: 'cat-smartphone', brandId: null, partnerId: null, questionAnswerId: 'qam-cosmetic-good', sequence: 1, ...audit },
  { id: 'qc-4-fair', productCategoryId: 'cat-smartphone', brandId: null, partnerId: null, questionAnswerId: 'qam-cosmetic-fair', sequence: 1, ...audit },
  { id: 'qc-4-poor', productCategoryId: 'cat-smartphone', brandId: null, partnerId: null, questionAnswerId: 'qam-cosmetic-poor', sequence: 1, ...audit },
];
