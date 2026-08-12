import { env } from '../config/env';
import { Question, QuestionnaireAnswer } from '../types/domain';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Applies the questionnaire's configured `valueImpactPercent` deductions/bonuses
 * on top of a base device price to compute the estimated max value.
 */
export function computeMaxValue(
  basePrice: number,
  questions: Question[],
  answers: QuestionnaireAnswer[],
): number {
  let totalImpactPercent = 0;

  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) continue;
    for (const optionId of answer.optionIds) {
      const option = question.options.find((o) => o.id === optionId);
      if (option) {
        totalImpactPercent += option.valueImpactPercent;
      }
    }
  }

  const clampedImpact = clamp(totalImpactPercent, -20, 100); // bonuses capped, deductions capped at 100%
  const value = basePrice * (1 - clampedImpact / 100);
  return Math.max(0, Math.round(value));
}

/** 35%-style drop applied when the customer skips the optional diagnosis step. */
export function applyNoDiagnosisDrop(maxValue: number): number {
  const drop = env.noDiagnosisValueDropPercent / 100;
  return Math.max(0, Math.round(maxValue * (1 - drop)));
}

/** Recalculates the final value once the (mock) diagnosis result is in. */
export function applyDiagnosisAdjustment(maxValue: number, adjustmentPercent: number): number {
  return Math.max(0, Math.round(maxValue * (1 - adjustmentPercent / 100)));
}
